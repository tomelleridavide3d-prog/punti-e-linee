// ==== LA VALLE DEI CLAN: disegni (tessere, animali, omini, palafitte) ====
// Ogni tessera si disegna col canvas UNA VOLTA per (tipo, rotazione, misura) e poi si incolla: niente ridisegni a ogni fotogramma.
// La tessera "logica" e' S x S unita'. Il prato e il bosco usano un rumore PERIODICO sulla misura della tessera e la tessera
// si disegna gia' ruotata (la grafica non gira con la tela): cosi' i bordi di tessere vicine combaciano senza cuciture.
// Anche gli alberi stanno su una griglia periodica: ogni tessera disegna pure gli alberi "fantasma" appena fuori dai suoi bordi
// di bosco, che sono gli stessi della tessera accanto, cosi' le chiome non si vedono tagliate.
// Definizione di una tessera (D, vedi il MAZZO nel motore):
//   e: 'bpfp'  lati N E S O (b bosco, p prato, f fiume nel mezzo del lato con prato ai fianchi)
//   fz: [[0], [2, 3]]  boschi: per ognuno i lati che tocca (lati dello stesso bosco = bosco unito); deep: boschi piu' profondi
//   rv: [{ e: [3, 1] }, { e: [0], end: 'l' }]  fiumi: lati; fine dentro la tessera: 'l' lago, 's' sorgente (at), 'b' nasce nel bosco
//   lake: { x, y, r, p }  lago con p pesci (i pesci stanno solo nei laghi)
//   ob: [{ k, x, y, s, f }]  animali, ambra, segni delle speciali e decorazioni (f = verso dove guarda)
// ==VA ENGINE==
// Motore della Valle dei Clan: geometria delle tessere (la stessa del disegno), mazzo, zone di ogni tessera.
// In node: require('giochi/valle.js') restituisce il motore (senza disegni).
(function (glob) {
  const S = 200;
  const MID = [[100, 0], [200, 100], [100, 200], [0, 100]], NRM = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  const CORN = [[200, 0], [200, 200], [0, 200], [0, 0]];   // angolo alla FINE del lato (senso orario)
  const RW = 24;                       // larghezza dell'acqua dei fiumi (uguale su tutte le tessere)
  const RB = 50, RC = 36, AMP = 7;     // bosco: profondita' dal lato, raggio dei collegamenti, ondulazione
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ---- rumore periodico (la stessa erba e lo stesso bordo del bosco su tutte le tessere) ----
  const hash = (i, j, k) => { const n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); };
  const hp = (i, j, s) => hash(((i % s) + s) % s, ((j % s) + s) % s, s);
  function vn(x, y, s) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hp(i, j, s), b = hp(i + 1, j, s), c = hp(i, j + 1, s), d = hp(i + 1, j + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const PER = 8, Q = PER / S;
  const fbm = (x, y) => 0.55 * vn(x * Q, y * Q, PER) + 0.3 * vn(x * Q * 2, y * Q * 2, PER * 2) + 0.15 * vn(x * Q * 4, y * Q * 4, PER * 4);

  // ---- rotazione (r quarti di giro in senso orario) ----
  const rp = (x, y, r) => { r = ((r % 4) + 4) % 4; for (let i = 0; i < r; i++) [x, y] = [S - y, x]; return [x, y]; };
  function rotDef(D, r) {
    r = ((r % 4) + 4) % 4; if (!r) return D;
    const re = a => a.map(e => (e + r) % 4), e = [0, 1, 2, 3].map(i => D.e[(i - r + 4) % 4]).join('');
    const rl = L => Object.assign({}, L, (([x, y]) => ({ x, y }))(rp(L.x, L.y, r)));
    const lake = D.lake && rl(D.lake), lakes = D.lakes && D.lakes.map(rl);
    return Object.assign({}, D, {
      e, fz: (D.fz || []).map(re), lake, lakes,
      rv: (D.rv || []).map(z => Object.assign({}, z, { e: re(z.e) }, z.at ? { at: rp(z.at[0], z.at[1], r) } : {})),
      ob: (D.ob || []).map(o => { const [x, y] = rp(o.x, o.y, r); return Object.assign({}, o, { x, y }); }),
    });
  }

  // ---- bosco: campo > 0 dentro ----
  const tap = u => u >= 0.5 ? 1 : Math.pow(Math.sin(u / 0.5 * Math.PI / 2), 0.55);
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(px - ax - dx * t, py - ay - dy * t);
  }
  // un bosco = i lati che tocca; lati vicini dello stesso bosco si uniscono dall'angolo, lati opposti passando dal centro
  function zoneF(D, zi, x, y) {
    const z = D.fz[zi], cx = clamp(x, 0, S), cy = clamp(y, 0, S), nz = (fbm(2 * cx + 73, 2 * cy + 19) - 0.5) * 2.2;
    if (z.length === 4) return 60;
    const rb = RB * (D.deep && D.deep.includes(zi) ? 1.5 : 1);
    let v = -99;
    for (const e of z) {
      let t, d;
      if (e === 0) { t = cx / S; d = cy; } else if (e === 1) { t = cy / S; d = S - cx; } else if (e === 2) { t = 1 - cx / S; d = S - cy; } else { t = 1 - cy / S; d = cx; }
      const g = (z.includes((e + 3) % 4) ? 1 : tap(t)) * (z.includes((e + 1) % 4) ? 1 : tap(1 - t)), r = rb * g;
      v = Math.max(v, r + nz * AMP * Math.min(1, r / 14) - d);
      if (z.includes((e + 1) % 4)) { const c = CORN[e]; v = Math.max(v, RC + 6 + nz * AMP - segDist(cx, cy, c[0], c[1], c[0] + (100 - c[0]) * 0.42, c[1] + (100 - c[1]) * 0.42)); }
    }
    const opp = z.length === 2 && (z[0] + 2) % 4 === z[1];
    if (opp) for (const e of z) v = Math.max(v, RC + nz * AMP - segDist(cx, cy, MID[e][0], MID[e][1], 100, 100));
    return v;
  }
  function forestF(D, x, y) {
    if (!D.fz || !D.fz.length) return -99;
    let best = -99;
    for (let i = 0; i < D.fz.length; i++) best = Math.max(best, zoneF(D, i, x, y));
    return best;
  }

  // ---- fiumi: curve di Bezier dal mezzo di un lato (fine dentro la tessera: lago, sorgente, bosco) ----
  const lakesOf = D => (D.lakes || (D.lake ? [D.lake] : [])).map(L => Object.assign({ x: 100, y: 100, r: 42 }, L));
  const lakeOf = D => lakesOf(D)[0] || null;
  function rivers(D) {
    const out = [], LS = lakesOf(D);
    (D.rv || []).forEach((z, zi) => {
      const L = LS[z.lk || 0];
      let s;
      if (z.e.length === 2 && !z.end) {
        const [a, b] = z.e, A = MID[a], B = MID[b], Ln = (a + 2) % 4 === b ? 66 : 55;
        let c1 = [A[0] + NRM[a][0] * Ln, A[1] + NRM[a][1] * Ln], c2 = [B[0] + NRM[b][0] * Ln, B[1] + NRM[b][1] * Ln];
        if (z.wig) { const px = -NRM[a][1], py = NRM[a][0]; c1 = [c1[0] + px * z.wig, c1[1] + py * z.wig]; c2 = [c2[0] - px * z.wig, c2[1] - py * z.wig]; }
        s = [A, c1, c2, B];
      } else {
        const a = z.e[0], A = MID[a], T = z.end === 'l' && L ? [L.x, L.y] : (z.at || [100, 100]);
        const c1 = [A[0] + NRM[a][0] * 32, A[1] + NRM[a][1] * 32];
        s = [A, c1, [T[0] + (c1[0] - T[0]) * 0.35, T[1] + (c1[1] - T[1]) * 0.35], T];
      }
      out.push({ z, zi, segs: [s] });
    });
    return out;
  }
  const bez = (s, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * s[0][i] + 3 * u * u * t * s[1][i] + 3 * u * t * t * s[2][i] + t * t * t * s[3][i]); };
  const bezA = (s, t) => { const a = bez(s, Math.max(0, t - 0.01)), b = bez(s, Math.min(1, t + 0.01)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  function waterPts(D, R) {   // punti dell'acqua (per tenere lontani erba, alberi e animali); sotto il bosco no: li' il fiume nasce tra gli alberi
    const p = [], LS = lakesOf(D);
    for (const r of R) for (const s of r.segs) for (let i = 0; i <= 30; i++) { const q = bez(s, i / 30); if (forestF(D, q[0], q[1]) < 2) p.push([q[0], q[1], RW / 2 + 5]); }
    for (const L of LS) p.push([L.x, L.y, L.r * 1.12 + 5]);
    for (const r of R) if (r.z.end === 's') { const a = r.z.at || [100, 100]; p.push([a[0], a[1], 24]); }
    return p;
  }
  const nearWater = (W, x, y, m) => W.some(q => Math.hypot(x - q[0], y - q[1]) < q[2] + m);

  // ---- IL MAZZO (come la versione online, edizione nuova: 1 partenza + 78 normali + 16 speciali, ogni tessera diversa) ----
  // Ricavato tessera per tessera dalle immagini del gioco online (BGA, img/tiles.jpg): lati, boschi, fiumi, laghi, pesci
  // (anche nei fiumi), animali e ambra (= il menhir). Disegni, nomi e posizioni sono nostri.
  // Lati N E S O: b bosco, p prato, f fiume. ob: cav cavallo (cervo, 1), bis bisonte (uro, 2), rin rinoceronte lanoso
  // (mammut, 3), orso (tigre: toglie un cavallo), ambra (menhir: chiudendo il bosco con un omino dentro si pesca una speciale),
  // miele (funghi: +3 al bosco), falo (incendio), zattera, canoa, rete (trappola), fossa, totem (sciamano), ces, sas, monte.
  const T = (id, e, o = {}) => Object.assign({ id, n: 1, e }, o);
  const LK = (x, y, r, p) => ({ x, y, r, p });
  const O = (k, x, y, s, f) => Object.assign({ k, x, y }, s ? { s } : {}, f ? { f } : {});
  const DECK = [
    T('start', 'pbbf', { start: 1, fz: [[1, 2]], lake: LK(74, 104, 40, 1), rv: [{ e: [3], end: 'l' }], ob: [O('ambra', 152, 142), O('bis', 82, 40, 0.8), O('monte', 160, 54)] }),
    T('n00', 'ppff', { rv: [{ e: [3, 2] }], ob: [O('cav', 150, 172)] }),
    T('n01', 'pffp', { rv: [{ e: [1, 2] }], ob: [O('cav', 66, 122), O('ces', 112, 58)] }),
    T('n02', 'ffff', { rv: [{ e: [0, 1] }, { e: [3, 2] }], ob: [O('cav', 168, 40, 0.6, -1), O('orso', 36, 170, 0.6)] }),
    T('n03', 'fbbb', { fz: [[3, 2], [1]], rv: [{ e: [0], end: 'b', at: [36, 124] }], ob: [O('orso', 112, 112, 0.8)] }),
    T('n04', 'ffff', { lake: LK(100, 100, 40, 2), rv: [{ e: [0], end: 'l' }, { e: [1], end: 'l' }, { e: [2], end: 'l' }, { e: [3], end: 'l' }], ob: [O('cav', 44, 58, 0.65), O('cav', 46, 182, 0.65)] }),
    T('n05', 'fpff', { lake: LK(110, 96, 40, 1), rv: [{ e: [0], end: 'l' }, { e: [2], end: 'l' }, { e: [3], end: 'l' }], ob: [O('cav', 44, 180, 0.65)] }),
    T('n06', 'bppb', { fz: [[0, 3]], ob: [O('cav', 124, 178)] }),
    T('n07', 'bbpb', { fz: [[0, 1, 3]], ob: [O('ambra', 64, 62)] }),
    T('n08', 'pffp', { rv: [{ e: [1, 2] }], ob: [O('orso', 64, 56)] }),
    T('n09', 'pffp', { rv: [{ e: [1, 2], p: 1 }], ob: [O('cav', 150, 58, 0.8, -1), O('ces', 56, 128)] }),
    T('n10', 'ffbp', { fz: [[2]], rv: [{ e: [0, 1], p: 2 }], ob: [O('bis', 50, 128, 0.85)] }),
    T('n11', 'bfff', { fz: [[0]], lake: LK(100, 116, 40, 1), rv: [{ e: [1], end: 'l' }, { e: [2], end: 'l' }, { e: [3], end: 'l' }] }),
    T('n12', 'ffpf', { lake: LK(100, 94, 42, 1), rv: [{ e: [0], end: 'l' }, { e: [1], end: 'l' }, { e: [3], end: 'l' }], ob: [O('cav', 150, 182, 0.75, -1)] }),
    T('n13', 'fffp', { lake: LK(106, 100, 40, 2), rv: [{ e: [0], end: 'l' }, { e: [1], end: 'l' }, { e: [2], end: 'l' }] }),
    T('n14', 'bppb', { fz: [[0, 3]], ob: [O('ambra', 58, 66), O('orso', 150, 174, 0.85, -1)] }),
    T('n15', 'ppbb', { fz: [[2, 3]], ob: [O('ambra', 56, 136), O('cav', 150, 56, 0.85, -1)] }),
    T('n16', 'pffp', { rv: [{ e: [1, 2] }], ob: [O('bis', 72, 92)] }),
    T('n17', 'fpbf', { fz: [[2]], rv: [{ e: [0, 3] }], ob: [O('bis', 146, 80, 0.85, -1)] }),
    T('n18', 'ffbb', { fz: [[2, 3]], rv: [{ e: [0, 1] }], ob: [O('ambra', 50, 160), O('bis', 84, 96, 0.85)] }),
    T('n19', 'fppf', { lake: LK(122, 128, 40, 1), rv: [{ e: [0], end: 'l' }, { e: [3], end: 'l' }], ob: [O('rin', 58, 66, 0.75), O('cav', 158, 52, 0.7, -1)] }),
    T('n20', 'fffp', { lake: LK(96, 86, 42, 1), rv: [{ e: [0], end: 'l' }, { e: [1], end: 'l' }, { e: [2], end: 'l' }], ob: [O('orso', 42, 172, 0.7)] }),
    T('n21', 'pfpf', { lake: LK(100, 96, 42, 1), rv: [{ e: [1], end: 'l' }, { e: [3], end: 'l' }], ob: [O('cav', 54, 178, 0.75)] }),
    T('n22', 'bbpb', { fz: [[0, 1, 3]], ob: [O('ambra', 76, 46), O('orso', 150, 172, 0.85, -1)] }),
    T('n23', 'fpbf', { fz: [[2]], lake: LK(84, 76, 40, 1), rv: [{ e: [0], end: 'l' }, { e: [3], end: 'l' }], ob: [O('bis', 156, 108, 0.75, -1)] }),
    T('n24', 'ffbp', { fz: [[2]], rv: [{ e: [0, 1] }], ob: [O('cav', 168, 40, 0.6, -1)] }),
    T('n25', 'fbbf', { fz: [[1, 2]], rv: [{ e: [3, 0] }] }),
    T('n26', 'pfff', { lake: LK(100, 112, 40, 1), rv: [{ e: [1], end: 'l' }, { e: [2], end: 'l' }, { e: [3], end: 'l' }], ob: [O('bis', 160, 50, 0.75, -1)] }),
    T('n27', 'fbfp', { fz: [[1]], lake: LK(80, 108, 42, 1), rv: [{ e: [0], end: 'l' }, { e: [2], end: 'l' }], ob: [O('cav', 124, 58, 0.65, -1)] }),
    T('n28', 'ffpf', { lake: LK(100, 104, 42, 1), rv: [{ e: [0], end: 'l' }, { e: [1], end: 'l' }, { e: [3], end: 'l' }] }),
    T('n29', 'ppfb', { fz: [[3]], rv: [{ e: [2], end: 's', at: [100, 44] }], ob: [O('cav', 160, 178, 0.8, -1)] }),
    T('n30', 'bffp', { fz: [[0]], rv: [{ e: [1, 2], p: 1 }] }),
    T('n31', 'bffb', { fz: [[0, 3]], rv: [{ e: [1, 2] }], ob: [O('ambra', 54, 56)] }),
    T('n32', 'pfbb', { fz: [[2, 3]], lake: LK(110, 74, 40, 1), rv: [{ e: [1], end: 'l' }], ob: [O('ambra', 52, 152)] }),
    T('n33', 'bfpf', { fz: [[0]], lake: LK(100, 112, 40, 3), rv: [{ e: [1], end: 'l' }, { e: [3], end: 'l' }] }),
    T('n34', 'pbbf', { fz: [[1, 2]], lake: LK(112, 84, 38, 2), rv: [{ e: [3], end: 'l' }] }),
    T('n35', 'fpbp', { fz: [[2]], lake: LK(94, 94, 42, 1), rv: [{ e: [0], end: 'l' }], ob: [O('orso', 162, 48, 0.75, -1)] }),
    T('n36', 'bbfb', { fz: [[0, 1, 3]], lake: LK(98, 124, 34, 1), rv: [{ e: [2], end: 'l' }], ob: [O('ambra', 110, 40)] }),
    T('n37', 'fbbb', { fz: [[1, 2, 3]], lake: LK(110, 76, 38, 2), rv: [{ e: [0], end: 'l' }], ob: [O('ambra', 62, 150)] }),
    T('n38', 'fbfb', { fz: [[1], [3]], rv: [{ e: [0, 2], p: 1 }] }),
    T('n39', 'fbfb', { fz: [[1], [3]], rv: [{ e: [0, 2] }], ob: [O('cav', 132, 178, 0.55, -1)] }),
    T('n40', 'fbfb', { fz: [[1], [3]], rv: [{ e: [0, 2] }], ob: [O('orso', 70, 44, 0.55)] }),
    T('n41', 'bbpb', { fz: [[0, 1, 3]], ob: [O('ambra', 70, 46), O('cav', 150, 172, 0.85, -1)] }),
    T('n42', 'bpbp', { fz: [[0], [2]], ob: [O('ambra', 112, 34)] }),
    T('n43', 'bbpb', { fz: [[0, 1, 3]], ob: [O('ambra', 110, 40)] }),
    T('n44', 'pbbp', { fz: [[1, 2]], ob: [O('ambra', 166, 120)] }),
    T('n45', 'ppbb', { fz: [[2, 3]], ob: [O('ambra', 52, 150), O('bis', 150, 52, 0.85, -1)] }),
    T('n46', 'pbbp', { fz: [[1, 2]], ob: [O('ambra', 160, 144)] }),
    T('n47', 'bbpb', { fz: [[0, 1, 3]], ob: [O('ambra', 62, 60), O('cav', 150, 176, 0.8, -1)] }),
    T('n48', 'bpbf', { fz: [[0], [2]], rv: [{ e: [3], end: 'b', at: [116, 34] }], ob: [O('ambra', 148, 26)] }),
    T('n49', 'bffb', { fz: [[0, 3]], rv: [{ e: [1, 2] }], ob: [O('ambra', 50, 46), O('cav', 134, 100, 0.7, -1)] }),
    T('n50', 'fbfb', { fz: [[1], [3]], lake: LK(96, 132, 34, 2), rv: [{ e: [0], end: 'l' }, { e: [2], end: 'l' }], ob: [O('ambra', 168, 64)] }),
    T('n51', 'ffbb', { fz: [[2, 3]], rv: [{ e: [0], end: 'b', at: [40, 128] }, { e: [1], end: 'b', at: [134, 168] }], ob: [O('ambra', 70, 160)] }),
    T('n52', 'bffb', { fz: [[0, 3]], rv: [{ e: [1, 2] }], ob: [O('ambra', 56, 60)] }),
    T('n53', 'pbpb', { fz: [[1], [3]], ob: [O('cav', 116, 172, 0.75)] }),
    T('n54', 'bbpb', { fz: [[0, 1, 3]], ob: [O('ambra', 140, 48)] }),
    T('n55', 'bbpb', { fz: [[0, 1, 3]], ob: [O('ambra', 100, 46)] }),
    T('n56', 'bbpp', { fz: [[0, 1]], ob: [O('ambra', 150, 50), O('cav', 56, 172, 0.85)] }),
    T('n57', 'pppp', { ob: [O('rin', 100, 124)] }),
    T('n58', 'pppp', { ob: [O('cav', 80, 64), O('ces', 116, 150), O('sas', 70, 150)] }),
    T('n59', 'pfpf', { rv: [{ e: [3, 1] }], ob: [O('rin', 142, 178, 0.8, -1)] }),
    T('n60', 'pfpf', { rv: [{ e: [3, 1] }], ob: [O('cav', 104, 56), O('ces', 40, 36)] }),
    T('n61', 'pfpf', { rv: [{ e: [3, 1] }], ob: [O('bis', 72, 50, 0.85)] }),
    T('n62', 'fpbp', { fz: [[2]], rv: [{ e: [0], end: 'b', at: [96, 168] }] }),
    T('n63', 'bbpp', { fz: [[0, 1]], ob: [O('cav', 54, 100, 0.85)] }),
    T('n64', 'fbfb', { fz: [[1], [3]], rv: [{ e: [0, 2] }], ob: [O('ambra', 168, 62)] }),
    T('n65', 'pbpb', { fz: [[1, 3]], ob: [O('ambra', 100, 104), O('cav', 102, 40, 0.65)] }),
    T('n66', 'bppp', { fz: [[0]], ob: [O('cav', 150, 176, 0.9, -1)] }),
    T('n67', 'ppbp', { fz: [[2]], ob: [O('bis', 120, 74)] }),
    T('n68', 'fbfb', { fz: [[1], [3]], rv: [{ e: [0, 2], p: 1 }], ob: [O('cav', 132, 178, 0.55, -1)] }),
    T('n69', 'pfbf', { fz: [[2]], rv: [{ e: [3, 1] }] }),
    T('n70', 'pfbf', { fz: [[2]], rv: [{ e: [3, 1], p: 1 }], ob: [O('cav', 70, 58, 0.8)] }),
    T('n71', 'fpfp', { rv: [{ e: [0, 2] }], ob: [O('cav', 54, 84, 0.85)] }),
    T('n72', 'pfpf', { rv: [{ e: [3, 1] }], ob: [O('cav', 70, 54, 0.85), O('orso', 146, 174, 0.85, -1)] }),
    T('n73', 'pfpf', { rv: [{ e: [3, 1] }], ob: [O('orso', 150, 174, 0.85, -1)] }),
    T('n74', 'bbpb', { fz: [[0, 1, 3]], ob: [O('ambra', 112, 64), O('orso', 108, 176, 0.85)] }),
    T('n75', 'bbpb', { fz: [[0, 1, 3]], ob: [O('ambra', 92, 60)] }),
    T('n76', 'bbpb', { fz: [[0, 1, 3]], ob: [O('ambra', 70, 60)] }),
    T('n77', 'pbpp', { fz: [[1]], ob: [O('rin', 80, 152)] }),
    // ---- 16 speciali (si pescano chiudendo un bosco con l'ambra e almeno un omino dentro) ----
    T('s_zattera', 'ffpf', { sp: 'zattera', lake: LK(96, 100, 42, 1), rv: [{ e: [0], end: 'l' }, { e: [1], end: 'l' }, { e: [3], end: 'l' }], ob: [O('zattera', 124, 70)] }),
    T('s_rete', 'bppp', { sp: 'rete', fz: [[0]], ob: [O('rete', 100, 136)] }),
    T('s_piu1', 'pbbp', { sp: 'piu', fz: [[1, 2]], ob: [O('ambra', 146, 146), O('rin', 62, 56, 0.75), O('orso', 52, 120, 0.7)] }),
    T('s_miele1', 'bbfb', { sp: 'miele', fz: [[0, 1, 3]], rv: [{ e: [2], end: 'b', at: [118, 44] }], ob: [O('miele', 70, 38)] }),
    T('s_piu2', 'ffbb', { sp: 'piu', fz: [[2, 3]], rv: [{ e: [0, 1] }], ob: [O('rin', 148, 64, 0.65, -1)] }),
    T('s_falo', 'pppp', { sp: 'falo', ob: [O('falo', 76, 84), O('orso', 144, 156)] }),
    T('s_piu3', 'fffp', { sp: 'piu', lake: LK(96, 110, 40, 1), rv: [{ e: [0], end: 'l' }, { e: [1], end: 'l' }, { e: [2], end: 'l' }], ob: [O('bis', 40, 156, 0.65), O('orso', 164, 174, 0.62, -1)] }),
    T('s_piu4', 'ppbp', { sp: 'piu', fz: [[2]], ob: [O('rin', 58, 96, 0.8), O('bis', 150, 62, 0.8, -1)] }),
    T('s_piu5', 'fbbf', { sp: 'piu', fz: [[1, 2]], lake: LK(80, 104, 42, 3), rv: [{ e: [0], end: 'l' }, { e: [3], end: 'l' }] }),
    T('s_fossa', 'bbpp', { sp: 'fossa', fz: [[0, 1]], ob: [O('fossa', 70, 140)] }),
    T('s_canoa', 'ffpf', { sp: 'canoa', lake: LK(96, 100, 44, 1), rv: [{ e: [0], end: 'l' }, { e: [1], end: 'l' }, { e: [3], end: 'l' }], ob: [O('canoa', 100, 84)] }),
    T('s_piu6', 'ffff', { sp: 'piu', lakes: [LK(140, 64, 32, 2), LK(62, 138, 32, 2)], rv: [{ e: [0], end: 'l', lk: 0 }, { e: [1], end: 'l', lk: 0 }, { e: [3], end: 'l', lk: 1 }, { e: [2], end: 'l', lk: 1 }], ob: [O('cav', 44, 50, 0.6), O('cav', 160, 180, 0.6, -1)] }),
    T('s_piu7', 'fppb', { sp: 'piu', fz: [[3]], lake: LK(110, 104, 42, 2), rv: [{ e: [0], end: 'l' }], ob: [O('cav', 160, 172, 0.7, -1)] }),
    T('s_piu8', 'fppf', { sp: 'piu', lake: LK(112, 92, 44, 1), rv: [{ e: [0], end: 'l' }, { e: [3], end: 'l' }], ob: [O('bis', 56, 170, 0.65), O('rin', 160, 172, 0.68, -1)] }),
    T('s_miele2', 'pbbf', { sp: 'miele', fz: [[1, 2]], lake: LK(84, 80, 42, 2), rv: [{ e: [3], end: 'l' }], ob: [O('miele', 112, 166)] }),
    T('s_totem', 'ffbp', { sp: 'totem', fz: [[2]], rv: [{ e: [0, 1], p: 1 }], ob: [O('totem', 64, 76)] }),
  ];
  const SPN = {   // nomi e spiegazioni delle speciali
    zattera: ['Zattera', 'A fine partita il suo sistema di fiumi vale 1 punto in piu\' per ogni lago.'],
    canoa: ['Canoa', 'Subito: 2 punti per ogni lago del suo sistema di fiumi.'],
    rete: ['Trappola', 'Subito: conti gli animali del prato qui intorno; poi non valgono piu\'.'],
    fossa: ['Fossa', 'A fine partita gli animali del prato qui intorno valgono doppio.'],
    totem: ['Totem dello sciamano', 'Subito: puoi riprenderti un tuo omino dalla mappa.'],
    miele: ['Alveare', 'Quando il bosco si chiude vale 3 punti in piu\'.'],
    falo: ['Incendio', 'A fine partita gli orsi del suo prato scappano: i cavalli valgono tutti.'],
    piu: ['Valle ricca', 'Piu\' animali e piu\' pesci del solito.'],
  };
  // tipi di lati e quantita' dell'originale (lettere del riferimento: f bosco, m prato, r fiume; a partire dal bosco, senso orario)
  const REF_2002 = { ffff: 1, fffm: 5, fffr: 4, ffmm: 11, ffmr: 1, ffrm: 4, ffrr: 7, fmfm: 4, fmfr: 2, fmmm: 5, fmmr: 1, fmrm: 2, fmrr: 4, frfr: 5, frmm: 3, frmr: 2, frrm: 3, mmmm: 3, mmmr: 1, mmrr: 6, mrmr: 6, mrrr: 8, rrrr: 3 };
  const canon = e => { const m = e.replace(/./g, c => ({ b: 'f', p: 'm', f: 'r' })[c]); let best = m; for (let r = 1; r < 4; r++) { const s = m.slice(r) + m.slice(0, r); if (s < best) best = s; } return best; };

  // ---- zone di una tessera, calcolate dalla STESSA geometria del disegno ----
  // Ogni lato ha 3 pezzi (senso orario): pezzo = lato * 3 + 0/1/2. Bosco: tutti e 3; fiume: il pezzo 1 (0 e 2 sono prato).
  // Zone: { k: 'b' bosco | 'f' fiume | 'l' lago | 'p' prato, s: pezzi, pt: punto per l'omino, ... }
  const GN = 80, GC = S / GN;
  function feats(D) {
    const R = rivers(D), LS = lakesOf(D), F = [], segOf = new Array(12).fill(-1);
    (D.fz || []).forEach((z, zi) => {
      const f = { k: 'b', zi, s: [], amber: 0, honey: 0, pt: null };
      for (const e of z) f.s.push(e * 3, e * 3 + 1, e * 3 + 2);
      let bv = -1e9; for (let y = 8; y < S; y += 8) for (let x = 8; x < S; x += 8) { const v = zoneF(D, zi, x, y) - (D.fz.length > 1 ? 0 : 0); if (v > bv) { bv = v; f.pt = [x, y]; } }
      F.push(f);
    });
    const lakeI = LS.map(L => { F.push({ k: 'l', fish: L.p || 0, rv: [], pt: [L.x, L.y + L.r * 0.55], lx: L.x, ly: L.y }); return F.length - 1; });
    for (const r of R) {
      const f = { k: 'f', zi: r.zi, s: r.z.e.map(e => e * 3 + 1), end: r.z.end || null, lake: r.z.end === 'l' ? lakeI[r.z.lk || 0] : -1, fish: r.z.p || 0 };
      const t = r.z.end ? 0.3 : 0.5, q = bez(r.segs[0], t); f.pt = [q[0], q[1]];
      if (f.lake >= 0) F[f.lake].rv.push(F.length);
      F.push(f);
    }
    F.forEach((f, i) => { if (f.s) for (const s of f.s) segOf[s] = i; });
    // prati: riempimento sulla griglia, l'acqua e il bosco fanno da muro
    const W = [];
    for (const r of R) for (const s of r.segs) for (let i = 0; i <= 40; i++) W.push(bez(s, i / 40));
    const sp = R.filter(r => r.z.end === 's').map(r => r.z.at || [100, 100]);
    const blk = new Uint8Array(GN * GN);
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
      const x = (i + 0.5) * GC, y = (j + 0.5) * GC;
      let b = forestF(D, x, y) > -1;
      if (!b) b = LS.some(L => Math.hypot(x - L.x, y - L.y) < L.r * 1.1 + 3);
      if (!b) b = sp.some(a => Math.hypot(x - a[0], y - a[1]) < 17);
      if (!b) for (const q of W) if (Math.abs(x - q[0]) < 16 && Math.abs(y - q[1]) < 16 && Math.hypot(x - q[0], y - q[1]) < RW / 2 + 3) { b = true; break; }
      blk[j * GN + i] = b ? 1 : 0;
    }
    const comp = new Int16Array(GN * GN).fill(-1), sizes = [];
    for (let k = 0; k < GN * GN; k++) {
      if (blk[k] || comp[k] >= 0) continue;
      const c = sizes.length, st = [k]; comp[k] = c; let n = 0;
      while (st.length) {
        const q = st.pop(); n++; const qi = q % GN, qj = (q / GN) | 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = qi + di, b = qj + dj; if (a < 0 || b < 0 || a >= GN || b >= GN) continue; const o = b * GN + a; if (!blk[o] && comp[o] < 0) { comp[o] = c; st.push(o); } }
      }
      sizes.push(n);
    }
    const cellAt = (x, y) => { const i = clamp(Math.floor(x / GC), 0, GN - 1), j = clamp(Math.floor(y / GC), 0, GN - 1); return j * GN + i; };
    const compNear = (x, y) => {
      const i0 = clamp(Math.floor(x / GC), 0, GN - 1), j0 = clamp(Math.floor(y / GC), 0, GN - 1);
      for (let r = 0; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const a = i0 + di, b = j0 + dj;
        if (a < 0 || b < 0 || a >= GN || b >= GN) continue; const c = comp[b * GN + a]; if (c >= 0 && sizes[c] > 6) return c;
      }
      return -1;
    };
    const sidePt = (s, fr) => s === 0 ? [fr * S, 2] : s === 1 ? [S - 2, fr * S] : s === 2 ? [S - fr * S, S - 2] : [2, S - fr * S];
    const mOf = new Map();   // componente -> zona di prato
    const meadow = c => { if (!mOf.has(c)) { mOf.set(c, F.length); F.push({ k: 'p', s: [], cav: 0, rin: 0, orso: 0, bis: 0, fire: 0, pit: 0, trap: 0, c, pt: null }); } return mOf.get(c); };
    for (let s = 0; s < 4; s++) for (let p = 0; p < 3; p++) {
      const g = s * 3 + p; if (segOf[g] >= 0) continue;
      const fr = [0.2, 0.5, 0.8][p], [x, y] = sidePt(s, fr), c = compNear(x, y);
      if (c < 0) continue;   // (non dovrebbe succedere: lo controlla la prova)
      const fi = meadow(c); F[fi].s.push(g); segOf[g] = fi;
    }
    sizes.forEach((n, c) => { if (n > 60) meadow(c); });   // prati chiusi dentro la tessera (es. 4 boschi)
    for (const o of D.ob || []) {
      if (o.k === 'ambra' || o.k === 'miele') {
        let bi = -1, bv = -1e9; F.forEach((f, i) => { if (f.k === 'b') { const v = zoneF(D, f.zi, o.x, o.y); if (v > bv) { bv = v; bi = i; } } });
        if (bi >= 0) F[bi][o.k === 'ambra' ? 'amber' : 'honey']++;
        o.z = bi;
      } else if (['cav', 'rin', 'orso', 'bis', 'falo', 'fossa', 'rete', 'totem'].includes(o.k)) {
        const c = compNear(o.x, o.y - 6), fi = c >= 0 ? meadow(c) : -1;
        if (fi >= 0) { const f = F[fi]; if (o.k === 'falo') f.fire++; else if (o.k === 'fossa') f.pit++; else if (o.k === 'rete') f.trap++; else if (o.k !== 'totem') f[o.k]++; }
        o.z = fi;
      } else if (o.k === 'zattera' || o.k === 'canoa') {   // sul lago piu' vicino
        let bi = -1, bd = 1e9; F.forEach((f, i) => { if (f.k === 'l') { const d = Math.hypot(f.lx - o.x, f.ly - o.y); if (d < bd) { bd = d; bi = i; } } });
        if (bi >= 0) F[bi][o.k === 'zattera' ? 'raft' : 'canoe'] = 1;
        o.z = bi;
      }
    }
    // punto dell'omino nel prato: la casella piu' lontana dai muri e dagli animali
    const far = new Float32Array(GN * GN).fill(1e9), q = [];
    for (let k = 0; k < GN * GN; k++) if (blk[k]) { far[k] = 0; q.push(k); }
    for (const o of D.ob || []) { const k = cellAt(o.x, o.y - 8); far[k] = 0; q.push(k); }
    for (let h = 0; h < q.length; h++) { const k = q[h], i = k % GN, j = (k / GN) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= GN || b >= GN) continue; const o = b * GN + a; if (far[o] > far[k] + 1) { far[o] = far[k] + 1; q.push(o); } } }
    for (const f of F) if (f.k === 'p') { let bk = -1, bv = -1; for (let k = 0; k < GN * GN; k++) if (comp[k] === f.c) { const i = k % GN, j = (k / GN) | 0, edge = Math.min(i, j, GN - 1 - i, GN - 1 - j); const v = Math.min(far[k], edge + 2); if (v > bv) { bv = v; bk = k; } } f.pt = [((bk % GN) + 0.5) * GC, (((bk / GN) | 0) + 0.5) * GC]; f.area = sizes[f.c]; delete f.c; }
    return { F, segOf };
  }
  // zone della tessera girata: i pezzi girano di 3 a ogni quarto di giro, i punti girano con la tessera
  const FC = new Map();
  function featsR(D, r) {
    const key = D.id + '|' + r; if (FC.has(key)) return FC.get(key);
    const base = FC.get(D.id + '|0') || (() => { const b = feats(D); FC.set(D.id + '|0', b); return b; })();
    if (!r) return base;
    const F = base.F.map(f => Object.assign({}, f, { s: f.s && f.s.map(g => (g + 3 * r) % 12), pt: f.pt && rp(f.pt[0], f.pt[1], r) }));
    const segOf = new Array(12).fill(-1); F.forEach((f, i) => { if (f.s) for (const g of f.s) segOf[g] = i; });
    const out = { F, segOf }; FC.set(key, out); return out;
  }
  const edges = (D, r) => { r = ((r % 4) + 4) % 4; return [0, 1, 2, 3].map(i => D.e[(i - r + 4) % 4]).join(''); };
  const byId = Object.fromEntries(DECK.map(d => [d.id, d]));

  const VE_GAME = {};
  // ---- LA PARTITA (regole della versione online, edizione nuova) ----
  // G = { deck, sp (speciali), at {"x,y": i}, tiles [{x, y, id, r, F}], nd (zone: gid = i * 16 + j), own (animali di ogni pezzo di prato),
  //       par/spar (unioni: zone e sistemi di fiumi+laghi), P [{ n, sc, men, huts }], cur, ph 'tile'|'meeple'|'totem'|'end',
  //       hand, bon (turno della speciale), want, last, ev (cose da mostrare), small2 (bosco di 2 tessere = 2 punti) }
  function rng32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const MEN = 5, HUTS = 3, PTS = { cav: 1, bis: 2, rin: 3 };   // cervo 1, uro 2, mammut 3
  const key = (x, y) => x + ',' + y, DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const ANIMS = ['cav', 'rin', 'orso', 'bis'];
  function newGame(o = {}) {
    const R = rng32(o.seed || 1), sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const deck = [], sp = [];
    for (const d of DECK) if (!d.start) for (let k = 0; k < d.n; k++) (d.sp ? sp : deck).push(d.id);
    const n = o.n || 2;
    const G = { seed: o.seed || 1, amberMan: o.amberMan !== false, small2: o.small2 !== false, deck: sh(deck), sp: sh(sp), at: {}, tiles: [], nd: [], own: [], par: [], spar: [],
      cur: 0, ph: 'tile', hand: null, bon: false, want: false, last: -1, ev: [], turn: 0, shOpts: null,
      P: Array.from({ length: n }, (_, i) => ({ n: (o.names || [])[i] || 'Giocatore ' + (i + 1), sc: 0, men: MEN, huts: HUTS })) };
    putTile(G, 0, 0, 'start', 0);
    draw(G);
    return G;
  }
  const find = (par, a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const root = (G, g) => G.nd[find(G.par, g)];
  const sroot = (G, g) => G.nd[find(G.spar, g)];
  function fits(G, x, y, id, r) {
    if (G.at[key(x, y)] !== undefined) return false;
    const e = edges(byId[id], r); let any = false;
    for (let s = 0; s < 4; s++) {
      const ni = G.at[key(x + DX[s], y + DY[s])]; if (ni === undefined) continue;
      const t = G.tiles[ni]; if (edges(byId[t.id], t.r)[(s + 2) % 4] !== e[s]) return false; any = true;
    }
    return any;
  }
  function frontier(G) {
    const out = new Set();
    for (const t of G.tiles) for (let s = 0; s < 4; s++) { const k = key(t.x + DX[s], t.y + DY[s]); if (G.at[k] === undefined) out.add(k); }
    return [...out].map(k => k.split(',').map(Number));
  }
  function spots(G, id = G.hand) {   // [{ x, y, r: [rotazioni valide] }]
    const out = [];
    for (const [x, y] of frontier(G)) { const rs = []; for (let r = 0; r < 4; r++) if (fits(G, x, y, id, r)) rs.push(r); if (rs.length) out.push({ x, y, r: rs }); }
    return out;
  }
  function draw(G) {   // pesca: una tessera che non si puo' mettere da nessuna parte si scarta
    for (;;) {
      const pile = G.bon ? G.sp : G.deck;
      if (!pile.length) { G.hand = null; return false; }
      const id = pile.pop();
      if (spots(G, id).length) { G.hand = id; G.ph = 'tile'; return true; }
      G.ev.push({ t: 'discard', id });
    }
  }
  function putTile(G, x, y, id, r) {
    const i = G.tiles.length, D = byId[id], { F, segOf } = featsR(D, r);
    G.tiles.push({ x, y, id, r, F }); G.at[key(x, y)] = i;
    F.forEach((f, j) => {
      const g = i * 16 + j;
      G.par[g] = g; G.spar[g] = g;
      G.nd[g] = { k: f.k, open: f.s ? f.s.length : 0, np: 1, amber: f.amber || 0, honey: f.honey || 0, rf: f.k === 'f' ? f.fish || 0 : 0,
        lakes: f.k === 'f' && f.lake >= 0 ? [i * 16 + f.lake] : [], cav: f.cav || 0, rin: f.rin || 0, orso: f.orso || 0, bis: f.bis || 0,
        fire: f.fire || 0, pit: f.pit || 0, men: [], huts: [], done: 0,
        sfish: f.fish || 0, slakes: f.k === 'l' ? 1 : 0, sraft: f.raft || 0 };
      if (f.k === 'p') G.own[g] = { cav: f.cav || 0, rin: f.rin || 0, orso: f.orso || 0, bis: f.bis || 0, cov: 0 };
    });
    F.forEach((f, j) => { if (f.k === 'f' && f.lake >= 0) sunion(G, i * 16 + j, i * 16 + f.lake); });
    for (let s = 0; s < 4; s++) {
      const ni = G.at[key(x + DX[s], y + DY[s])]; if (ni === undefined) continue;
      const nt = G.tiles[ni], ns = featsR(byId[nt.id], nt.r).segOf;
      for (let p = 0; p < 3; p++) {
        const a = i * 16 + segOf[s * 3 + p], b = ni * 16 + ns[((s + 2) % 4) * 3 + (2 - p)];
        const ra = root(G, a), rb = root(G, b);
        if (ra.k === 'b' || ra.k === 'f') { ra.open--; rb.open--; }
        union(G, a, b);
        if (ra.k === 'f') sunion(G, a, b);
      }
    }
    return i;
  }
  function union(G, a, b) {
    a = find(G.par, a); b = find(G.par, b); if (a === b) return;
    const A = G.nd[a], B = G.nd[b]; G.par[b] = a;
    for (const k of ['open', 'np', 'amber', 'honey', 'rf', 'cav', 'rin', 'orso', 'bis', 'fire', 'pit']) A[k] += B[k];
    for (const l of B.lakes) if (!A.lakes.includes(l)) A.lakes.push(l);
    A.men.push(...B.men);
  }
  function sunion(G, a, b) {
    a = find(G.spar, a); b = find(G.spar, b); if (a === b) return;
    const A = G.nd[a], B = G.nd[b]; G.spar[b] = a; A.sfish += B.sfish; A.slakes += B.slakes; A.sraft += B.sraft; A.huts.push(...B.huts);
  }
  // ---- turno ----
  function place(G, x, y, r) {
    if (G.ph !== 'tile' || !fits(G, x, y, G.hand, r)) return false;
    G.last = putTile(G, x, y, G.hand, r); G.hand = null; G.ph = 'meeple';
    return true;
  }
  function meepleOpts(G) {   // [{ j, k: 'man'|'hut' }] sulla tessera appena messa
    const i = G.last, P = G.P[G.cur], out = []; if (i < 0) return out;
    const sys = new Map();   // una sola palafitta per sistema di fiumi (sul lago se c'e'): sono la stessa scelta
    G.tiles[i].F.forEach((f, j) => {
      const g = i * 16 + j;
      if (P.men > 0 && (f.k === 'b' || f.k === 'f' || f.k === 'p')) { const R = root(G, g); if (!R.men.length && !R.done) out.push({ j, k: 'man' }); }
      if (P.huts > 0 && (f.k === 'f' || f.k === 'l')) { const sg = find(G.spar, g); if (!G.nd[sg].huts.length && (!sys.has(sg) || f.k === 'l')) sys.set(sg, j); }
    });
    for (const j of sys.values()) out.push({ j, k: 'hut' });
    return out;
  }
  const winners = men => { const c = {}; for (const m of men) c[m.p] = (c[m.p] || 0) + 1; const mx = Math.max(0, ...Object.values(c)); return Object.keys(c).filter(p => c[p] === mx).map(Number); };
  const riverPts = (G, R) => R.np + R.rf + R.lakes.reduce((s, l) => s + byLake(G, l), 0);   // tessere + pesci del fiume + pesci dei laghi in fondo
  const byLake = (G, l) => { const t = G.tiles[(l / 16) | 0]; return t.F[l % 16].fish || 0; };
  const forestPts = (G, R) => (G.small2 && R.np === 2 ? 2 : 2 * R.np) + 3 * R.honey;   // alveari (funghi): 3 punti ciascuno
  const animalPts = (a, dbl = null) => {   // a = { cav, rin, orso, bis, fire }; dbl = stessi campi per gli animali doppi (fossa)
    const d = dbl || { cav: 0, rin: 0, orso: 0, bis: 0 }, T = a.fire ? 0 : a.orso + d.orso;
    const rn = Math.min(T, a.cav), rd = Math.min(T - rn, d.cav);   // l'orso si mangia prima il cavallo che vale meno
    return PTS.cav * (a.cav - rn) + 2 * PTS.cav * (d.cav - rd) + PTS.bis * a.bis + 2 * PTS.bis * d.bis + PTS.rin * a.rin + 2 * PTS.rin * d.rin;
  };
  const meadowPts = R => animalPts(R);
  // pezzi di prato di una zona, con la loro tessera (per trappola e fossa)
  function meadowParts(G, rg) { const out = []; for (let g = 0; g < G.nd.length; g++) if (G.nd[g] && G.nd[g].k === 'p' && find(G.par, g) === rg) out.push(g); return out; }
  const near = (G, a, b) => { const A = G.tiles[(a / 16) | 0], B = G.tiles[(b / 16) | 0]; return Math.abs(A.x - B.x) <= 1 && Math.abs(A.y - B.y) <= 1; };
  function meadowFinal(G, rg) {   // punti del prato a fine partita: la fossa raddoppia gli animali delle 8 tessere intorno
    const R = G.nd[rg], parts = meadowParts(G, rg), pits = parts.filter(g => G.tiles[(g / 16) | 0].F[g % 16].pit);
    if (!pits.length) return animalPts(R);
    const a = { cav: 0, rin: 0, orso: 0, bis: 0, fire: R.fire }, d = { cav: 0, rin: 0, orso: 0, bis: 0 };
    for (const g of parts) { const o = G.own[g]; if (o.cov) continue; const t = pits.some(p => near(G, p, g)) ? d : a; for (const k of ANIMS) t[k] += o[k]; }
    return animalPts(a, d);
  }
  function meeple(G, o) {   // o = { j, k } oppure null; poi si contano le zone chiuse e i poteri della speciale
    if (G.ph !== 'meeple') return false;
    const i = G.last, P = G.P[G.cur], T = G.tiles[i], D = byId[T.id];
    if (o) {
      if (!meepleOpts(G).some(m => m.j === o.j && m.k === o.k)) return false;
      const g = i * 16 + o.j, m = { p: G.cur, i, j: o.j };
      if (o.k === 'man') { root(G, g).men.push(m); P.men--; }
      else { sroot(G, g).huts.push(m); P.huts--; }
      G.ev.push({ t: 'put', p: G.cur, i, j: o.j, k: o.k });
    }
    // zone chiuse dalla tessera
    const seen = new Set();
    T.F.forEach((f, j) => {
      if (f.k !== 'b' && f.k !== 'f') return;
      const rg = find(G.par, i * 16 + j); if (seen.has(rg)) return; seen.add(rg);
      const R = G.nd[rg]; if (R.open > 0 || R.done) return;
      R.done = 1;
      const pts = f.k === 'b' ? forestPts(G, R) : riverPts(G, R), win = winners(R.men);
      for (const p of win) G.P[p].sc += pts;
      G.ev.push({ t: 'score', k: f.k, g: rg, pts, win, men: R.men.slice() });
      const had = R.men.length; for (const m of R.men) G.P[m.p].men++;
      R.men = [];
      if (f.k === 'b' && R.amber > 0 && !G.bon && G.sp.length && (!G.amberMan || had)) G.want = true;   // ambra: serve un omino nel bosco
    });
    // poteri delle speciali che valgono subito
    if (D.sp === 'canoa') T.F.forEach((f, j) => { if (f.canoe) { const pts = 2 * sroot(G, i * 16 + j).slakes; G.P[G.cur].sc += pts; G.ev.push({ t: 'score', k: 'canoa', g: i * 16 + j, pts, win: [G.cur], men: [] }); } });
    if (D.sp === 'rete') T.F.forEach((f, j) => {
      if (!f.trap) return;
      const rg = find(G.par, i * 16 + j), R = G.nd[rg], a = { cav: 0, rin: 0, orso: 0, bis: 0, fire: R.fire };
      for (const g of meadowParts(G, rg)) { if (!near(G, i * 16 + j, g)) continue; const ow = G.own[g]; if (ow.cov) continue; for (const k of ANIMS) { a[k] += ow[k]; R[k] -= ow[k]; } ow.cov = 1; }
      const pts = animalPts(a); G.P[G.cur].sc += pts; G.ev.push({ t: 'score', k: 'rete', g: i * 16 + j, pts, win: [G.cur], men: [] });
    });
    if (D.sp === 'totem') {
      const mine = pieces(G).filter(m => m.k === 'man' && m.p === G.cur);
      if (mine.length) { G.ph = 'totem'; G.shOpts = mine; return true; }
    }
    next(G);
    return true;
  }
  function totem(G, m) {   // lo sciamano: riprendi (o no) un tuo omino, senza punti
    if (G.ph !== 'totem') return false;
    if (m) {
      const R = root(G, m.i * 16 + m.j), k = R.men.findIndex(q => q.p === G.cur && q.i === m.i && q.j === m.j);
      if (k < 0) return false;
      R.men.splice(k, 1); G.P[G.cur].men++; G.ev.push({ t: 'back', p: G.cur, i: m.i, j: m.j });
    }
    G.shOpts = null; next(G); return true;
  }
  function next(G) {
    G.last = -1; G.turn++;
    if (G.want && !G.bon) { G.want = false; G.bon = true; if (draw(G)) { G.ev.push({ t: 'bonus', p: G.cur, id: G.hand }); return; } }
    G.bon = false; G.want = false;
    G.cur = (G.cur + 1) % G.P.length;
    if (!draw(G)) finish(G);
  }
  function finish(G) {   // fine: fiumi e boschi aperti non valgono niente; si contano palafitte e prati
    G.ph = 'end'; G.hand = null;
    const seen = new Set(), sseen = new Set();
    for (let g = 0; g < G.nd.length; g++) {
      if (!G.nd[g] || (G.nd[g].k !== 'f' && G.nd[g].k !== 'l')) continue;
      const sg = find(G.spar, g), S2 = G.nd[sg];
      if (S2.huts.length && !sseen.has(sg)) { sseen.add(sg); const win = winners(S2.huts), pts = S2.sfish + S2.sraft * S2.slakes; for (const p of win) G.P[p].sc += pts; G.ev.push({ t: 'score', k: 'h', g: sg, pts, win, men: S2.huts.slice(), end: 1 }); }
    }
    for (let g = 0; g < G.nd.length; g++) {
      if (!G.nd[g]) continue;
      const rg = find(G.par, g), R = G.nd[rg];
      if (R.k === 'p' && R.men.length && !seen.has(rg)) {
        seen.add(rg);
        const win = winners(R.men), pts = meadowFinal(G, rg);
        for (const p of win) G.P[p].sc += pts;
        G.ev.push({ t: 'score', k: 'p', g: rg, pts, win, men: R.men.slice(), end: 1 });
      }
    }
  }
  // tutti gli omini sulla mappa: [{ p, i, j, k: 'man'|'hut' }]
  function pieces(G) {
    const out = [], seen = new Set(), sseen = new Set();
    for (let g = 0; g < G.nd.length; g++) {
      if (!G.nd[g]) continue;
      const rg = find(G.par, g); if (!seen.has(rg)) { seen.add(rg); for (const m of G.nd[rg].men) out.push(Object.assign({ k: 'man', z: G.nd[rg].k }, m)); }
      const sg = find(G.spar, g); if (!sseen.has(sg)) { sseen.add(sg); for (const m of G.nd[sg].huts) out.push(Object.assign({ k: 'hut' }, m)); }
    }
    return out;
  }
  // ---- copia veloce (per il computer che prova le mosse) ----
  function clone(G) {
    const C = Object.assign({}, G);
    C.deck = G.deck.slice(); C.sp = G.sp.slice(); C.at = Object.assign({}, G.at); C.tiles = G.tiles.slice(); C.par = G.par.slice(); C.spar = G.spar.slice(); C.ev = [];
    C.P = G.P.map(p => Object.assign({}, p));
    C.nd = G.nd.map(n => n && Object.assign({}, n, { lakes: n.lakes.slice(), men: n.men.slice(), huts: n.huts.slice() }));
    C.own = G.own.map(o => o && Object.assign({}, o));
    return C;
  }
  // ---- IL COMPUTER: prova ogni posto, rotazione e omino, e sceglie la mossa che lo mette meglio rispetto al piu' forte degli altri ----
  function value(G, p) {
    const left = G.deck.length, tot = 78, late = 1 - left / tot, P = G.P[p];
    let v = P.sc;
    const seen = new Set(), sseen = new Set();
    for (let g = 0; g < G.nd.length; g++) {
      if (!G.nd[g]) continue;
      const rg = find(G.par, g);
      if (!seen.has(rg)) {
        seen.add(rg); const R = G.nd[rg];
        if (R.men.length && !R.done) {
          const win = winners(R.men);
          if (win.includes(p)) {
            if (R.k === 'p') v += meadowPts(R) * (0.75 + 0.25 * late) + 1.2 * (1 - late) + R.pit * 2;
            else {
              const pc = clamp(0.9 - 0.13 * R.open, 0.05, 0.9) * clamp(left / (R.open * 4 + 1), 0, 1);
              v += (R.k === 'b' ? forestPts(G, R) + (R.amber ? 3 : 0) : riverPts(G, R)) * pc;
            }
          }
        }
      }
      const nd = G.nd[g];
      if (nd.k === 'f' || nd.k === 'l') { const sg = find(G.spar, g); if (!sseen.has(sg)) { sseen.add(sg); const S2 = G.nd[sg]; if (S2.huts.length && winners(S2.huts).includes(p)) v += (S2.sfish + S2.sraft * S2.slakes) * (0.85 + 0.15 * late) + 1.5 * (1 - late); } }
    }
    v += P.men * (1.6 * (1 - late) + 0.2) + P.huts * (2.2 * (1 - late));
    return v;
  }
  function utility(G, p) { let best = -1e9; for (let q = 0; q < G.P.length; q++) if (q !== p) best = Math.max(best, value(G, q)); return value(G, p) - best; }
  function bestTotem(G, p) {   // quale omino riprendere con lo sciamano (o nessuno)
    let best = null, bu = -1e9;
    for (const m of [null, ...G.shOpts]) { const C = clone(G); totem(C, m); const u = utility(C, p); if (u > bu) { bu = u; best = m; } }
    return { m: best, u: bu };
  }
  function aiMove(G, opt = {}) {   // opt: { noise (0 = perfetto), seed } -> { x, y, r, m, sh }
    const p = G.cur, R = rng32((opt.seed || 7) + G.turn * 131), noise = opt.noise || 0, all = [];
    for (const s of spots(G)) for (const r of s.r) {
      const C = clone(G); place(C, s.x, s.y, r);
      const ms = [null, ...meepleOpts(C)];
      for (const m of ms) {
        const C2 = ms.length > 1 ? clone(C) : C; meeple(C2, m);
        let sh = null, u;
        if (C2.ph === 'totem') { const b = bestTotem(C2, p); sh = b.m; u = b.u; } else u = utility(C2, p);
        all.push({ x: s.x, y: s.y, r, m, sh, u: u + (noise ? (R() - 0.5) * noise : 0) });
      }
    }
    all.sort((a, b) => b.u - a.u);
    return all[0];
  }

  Object.assign(VE_GAME, { newGame, fits, spots, place, meepleOpts, meeple, totem, pieces, clone, aiMove, bestTotem, value, utility, root, sroot, find, frontier, draw, rng32, meadowPts, meadowFinal, animalPts, riverPts, forestPts, winners, MEN, HUTS, PTS });

  const VE = { S, MID, NRM, CORN, RW, RB, clamp, hash, fbm, rp, rotDef, zoneF, forestF, lakeOf, rivers, bez, bezA, waterPts, nearWater, segDist, DECK, SPN, lakesOf, canon, feats, featsR, edges, byId };
  Object.assign(VE, VE_GAME);
  glob.VE = VE;
  if (typeof module !== 'undefined' && module.exports) module.exports = VE;
})(typeof window !== 'undefined' ? window : globalThis);
// ==END VA ENGINE==

if (typeof document !== 'undefined') (() => {
  const { S, MID, NRM, RW, clamp, hash, fbm, rotDef, zoneF, forestF, lakeOf, lakesOf, rivers, bez, bezA, waterPts, nearWater } = VE;
  const TAU = Math.PI * 2, INK = '#2a2118';
  const CPU = typeof CQ_CPU !== 'undefined' ? CQ_CPU : { willReadFrequently: true };
  const cache = new Map();
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const strSeed = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

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
    const LS = lakesOf(D), springs = R.filter(r => r.z.end === 's').map(r => r.z.at || [100, 100]), seed = strSeed(D.id || 'x');
    const line = (w, c) => {
      g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round';
      for (const r of R) for (const s of r.segs) { g.beginPath(); g.moveTo(s[0][0], s[0][1]); g.bezierCurveTo(s[1][0], s[1][1], s[2][0], s[2][1], s[3][0], s[3][1]); g.stroke(); }
    };
    const pools = (off, c) => {
      g.fillStyle = c;
      LS.forEach((L, k) => { lakePath(g, L.x, L.y, L.r, off, seed + k * 17); g.fill(); });
      for (const a of springs) { lakePath(g, a[0], a[1], 13, off * 0.7, seed + 9); g.fill(); }
    };
    line(RW + 13, 'rgba(40,80,30,.35)'); pools(7, 'rgba(40,80,30,.35)');      // ombra della riva
    line(RW + 8, '#d9d49c'); pools(4.5, '#d9d49c');                           // sabbia
    line(RW, '#3f97d3'); line(RW * 0.5, 'rgba(120,200,240,.55)');             // acqua del fiume
    pools(0, '#3f97d3'); LS.forEach((L, k) => { g.fillStyle = 'rgba(120,200,240,.5)'; lakePath(g, L.x, L.y, L.r, -12, seed + k * 17); g.fill(); });
    // riflessi (lontani dai lati della tessera e dal lago)
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.4; g.lineCap = 'round';
    for (const r of R) for (const s of r.segs) for (let i = 0; i < 4; i++) {
      const t = 0.18 + i * 0.2 + rnd() * 0.05, q = bez(s, t), a = bezA(s, t), side = (i % 2 ? 1 : -1) * RW * 0.22;
      const x = q[0] - Math.sin(a) * side, y = q[1] + Math.cos(a) * side;
      if (x < 12 || x > S - 12 || y < 12 || y > S - 12 || LS.some(L => Math.hypot(x - L.x, y - L.y) < L.r + 6) || forestF(D, x, y) > -2) continue;
      g.beginPath(); g.moveTo(x - Math.cos(a) * 3.5, y - Math.sin(a) * 3.5); g.lineTo(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5); g.stroke();
    }
    for (const L of LS) {
      for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4, x = L.x + Math.cos(a) * L.r * 0.62, y = L.y + Math.sin(a) * L.r * 0.55; g.beginPath(); g.arc(x, y, 4.5, Math.PI * 1.1, Math.PI * 1.6); g.stroke(); }
      reeds(g, D, L, R, seed);
    }
    for (const [cx, cy] of springs) {   // sorgente: polla d'acqua tra i sassi, con le bollicine
      const out = R.filter(r => r.z.end === 's').map(r => bezA(r.segs[0], 0.95) + Math.PI);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU + 0.3, rr = 17.5 + (i % 2) * 1.5, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.92, sz = 3.4 + (i * 7 % 3);
        if (out.some(o => Math.cos(a - o) > 0.8)) continue;   // niente sasso dove esce il fiume
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 1, y + 1.5, sz, sz * 0.7, 0, 0, TAU); g.fill();
        g.fillStyle = '#a9a49a'; g.beginPath(); g.ellipse(x, y, sz, sz * 0.72, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(x - sz * 0.3, y - sz * 0.25, sz * 0.4, sz * 0.22, 0, 0, TAU); g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.2;
      for (const [dx, dy, r] of [[-3, -2, 2.2], [3, 1, 1.6], [0, 4, 1.2]]) { g.beginPath(); g.arc(cx + dx, cy + dy, r, 0, TAU); g.stroke(); }
    }
  }
  function reeds(g, D, L, R, seed) {   // canne sulla riva, non dove entrano i fiumi ne' sotto il bosco
    const ins = R.filter(r => r.z.end === 'l').map(r => bezA(r.segs[0], 0.97) + Math.PI);
    let n = 0;
    for (let i = 0; i < 12 && n < 3; i++) {
      const a = hash(seed, i, 7) * TAU; if (ins.some(o => Math.cos(a - o) > 0.7)) continue;
      const x = L.x + Math.cos(a) * (L.r + 3), y = L.y + Math.sin(a) * (L.r + 3) * 0.92;
      if (x < 10 || x > S - 10 || y < 14 || y > S - 6 || forestF(D, x, y) > -4) continue;
      n++;
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
  function fishes(g, D, R) {   // pesci nei laghi e nei fiumi: si contano a colpo d'occhio
    for (const L of lakesOf(D)) {
      const n = L.p || 0; if (!n) continue;
      if (n === 1) { fish(g, L.x - 2, L.y - 1, -0.35, 1.15); continue; }
      for (let i = 0; i < n; i++) { const a = i / n * TAU + 0.6; fish(g, L.x + Math.cos(a) * L.r * 0.42, L.y + Math.sin(a) * L.r * 0.36, a + Math.PI / 2, 1.05); }
    }
    for (const r of R) {
      const n = r.z.p || 0; if (!n) continue;
      const s0 = r.segs[0];
      for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : 0.32 + 0.36 * i / (n - 1), q = bez(s0, t), a = bezA(s0, t); fish(g, q[0], q[1], a + (i % 2 ? Math.PI : 0), 0.95); }
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

  // ---- decorazioni e segni delle tessere speciali ----
  function rock(g, x, y, rx, ry, c = '#aaa497') {
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + 1.2, y + 1.5, rx, ry, 0, 0, TAU); g.fill();
    g.fillStyle = c; g.strokeStyle = '#5d5850'; g.lineWidth = 0.9; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.38)'; g.beginPath(); g.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.42, ry * 0.3, 0, 0, TAU); g.fill();
  }
  function bush(g, x, y) {
    g.fillStyle = 'rgba(10,30,5,.25)'; g.beginPath(); g.ellipse(x + 2, y + 3, 13, 7, 0, 0, TAU); g.fill();
    for (const [dx, dy, r, c] of [[-6, 0, 6.5, '#4f8a34'], [5, 1, 6, '#5a9638'], [0, -4, 7, '#62a03e']]) {
      g.fillStyle = c; g.strokeStyle = '#2c4f20'; g.lineWidth = 1; g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(200,240,140,.3)'; g.beginPath(); g.arc(x + dx - r * 0.3, y + dy - r * 0.3, r * 0.4, 0, TAU); g.fill();
    }
    g.fillStyle = '#c0304a'; for (const [dx, dy] of [[-4, -1], [3, -5], [6, 2]]) { g.beginPath(); g.arc(x + dx, y + dy, 1.3, 0, TAU); g.fill(); }
  }
  function mount(g, x, y) {   // monte che fuma (la tessera di partenza)
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + 3, y + 3, 34, 10, 0, 0, TAU); g.fill();
    const body = () => { g.beginPath(); g.moveTo(x - 34, y); g.quadraticCurveTo(x - 18, y - 22, x - 8, y - 36); g.lineTo(x + 7, y - 36); g.quadraticCurveTo(x + 18, y - 20, x + 34, y); g.closePath(); };
    const gr = g.createLinearGradient(x - 30, 0, x + 30, 0); gr.addColorStop(0, '#9a8a76'); gr.addColorStop(1, '#6e6252');
    g.fillStyle = gr; body(); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(x - 8, y - 35); g.quadraticCurveTo(x - 16, y - 18, x - 26, y - 4); g.lineTo(x - 18, y - 4); g.quadraticCurveTo(x - 10, y - 18, x - 4, y - 34); g.closePath(); g.fill();
    g.fillStyle = '#e8743a'; g.beginPath(); g.ellipse(x, y - 36, 7.5, 2.4, 0, 0, TAU); g.fill();
    g.strokeStyle = '#d65a2a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x - 2, y - 35); g.quadraticCurveTo(x - 5, y - 26, x - 3, y - 18); g.stroke();
    for (const [dx, dy, r, a] of [[2, -46, 7, 0.75], [-5, -56, 9, 0.6], [5, -67, 11, 0.45]]) { g.fillStyle = 'rgba(235,232,226,' + a + ')'; g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); }
  }
  function fire(g, x, y) {   // falo': scaccia gli orsi dal suo prato
    const gr = g.createRadialGradient(x, y - 6, 0, x, y - 6, 30); gr.addColorStop(0, 'rgba(255,190,80,.6)'); gr.addColorStop(1, 'rgba(255,150,40,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y - 6, 30, 0, TAU); g.fill();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; rock(g, x + Math.cos(a) * 12, y + Math.sin(a) * 6, 3.6, 2.6); }
    g.lineCap = 'round';
    for (const [a, b] of [[[-10, 3], [9, -3]], [[-9, -3], [10, 3]]]) { g.strokeStyle = INK; g.lineWidth = 5.4; g.beginPath(); g.moveTo(x + a[0], y + a[1]); g.lineTo(x + b[0], y + b[1]); g.stroke(); g.strokeStyle = '#8b5a2b'; g.lineWidth = 3.6; g.stroke(); }
    const fl = (s, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y - 24 * s); g.bezierCurveTo(x + 9 * s, y - 13 * s, x + 9 * s, y - 2, x, y); g.bezierCurveTo(x - 9 * s, y - 2, x - 9 * s, y - 13 * s, x, y - 24 * s); g.fill(); };
    g.strokeStyle = '#8a2a10'; g.lineWidth = 1.2; fl(1, '#e8501f'); g.stroke(); fl(0.7, '#ff9a2a'); fl(0.42, '#ffe066');
  }
  function hive(g, x, y) {   // alveare selvatico (miele): +2 al bosco chiuso
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 2, y + 9, 10, 4, 0, 0, TAU); g.fill();
    const body = () => { g.beginPath(); g.moveTo(x - 10, y + 8); g.bezierCurveTo(x - 12, y - 6, x - 6, y - 14, x, y - 14); g.bezierCurveTo(x + 6, y - 14, x + 12, y - 6, x + 10, y + 8); g.closePath(); };
    g.strokeStyle = '#fff'; g.lineWidth = 4; body(); g.stroke();
    g.fillStyle = '#e8b33a'; body(); g.fill(); g.strokeStyle = '#6a4210'; g.lineWidth = 1.2; g.stroke();
    g.save(); body(); g.clip(); g.strokeStyle = '#b07a1c'; g.lineWidth = 1.3;
    for (let k = -8; k <= 6; k += 4.4) { g.beginPath(); g.moveTo(x - 13, y + k); g.quadraticCurveTo(x, y + k + 2.5, x + 13, y + k); g.stroke(); }
    g.restore();
    g.fillStyle = '#3a2410'; g.beginPath(); g.ellipse(x, y + 4.5, 2.6, 2, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x - 4.5, y - 7, 2, 3.5, 0.4, 0, TAU); g.fill();
    for (const [dx, dy] of [[13, -12], [-14, -4], [9, -19]]) {
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(x + dx - 1, y + dy - 2, 2, 1.3, -0.5, 0, TAU); g.ellipse(x + dx + 1.2, y + dy - 2, 2, 1.3, 0.5, 0, TAU); g.fill();
      g.fillStyle = '#f2c230'; g.strokeStyle = INK; g.lineWidth = 0.7; g.beginPath(); g.ellipse(x + dx, y + dy, 2.4, 1.7, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = INK; g.fillRect(x + dx - 0.4, y + dy - 1.6, 0.9, 3.2);
    }
  }
  function stones(g, x, y) {   // cerchio di pietre: solo il cacciatore messo qui conta il prato
    g.fillStyle = 'rgba(80,120,40,.25)'; g.beginPath(); g.ellipse(x, y, 24, 12, 0, 0, TAU); g.fill();
    const P = []; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU - Math.PI / 2; P.push([x + Math.cos(a) * 20, y + Math.sin(a) * 9.5]); }
    P.sort((a, b) => a[1] - b[1]);
    for (const [px, py] of P) {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(px + 2, py + 1, 4.5, 1.8, 0, 0, TAU); g.fill();
      g.fillStyle = '#b3ad9f'; g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(px - 3.6, py); g.lineTo(px - 3, py - 12); g.quadraticCurveTo(px, py - 15, px + 3, py - 12); g.lineTo(px + 3.6, py); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px - 2.2, py - 11, 1.6, 9);
    }
    g.fillStyle = '#8fd0ff'; g.strokeStyle = '#2b5f8a'; g.lineWidth = 0.9;
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 2 : 4.6; g.lineTo(x + Math.cos(a) * r, y - 3 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke();
  }
  function raft(g, x, y) {   // zattera di tronchi legati
    g.save(); g.translate(x, y); g.rotate(-0.35);
    g.fillStyle = 'rgba(10,40,70,.35)'; g.fillRect(-15, -9, 32, 22);
    for (let i = 0; i < 5; i++) { const yy = -10 + i * 4.4; g.fillStyle = i % 2 ? '#9a6a3a' : '#8b5a2b'; g.strokeStyle = INK; g.lineWidth = 0.9; g.beginPath(); g.roundRect(-16, yy, 32, 4.2, 2); g.fill(); g.stroke(); g.fillStyle = '#c8955a'; g.beginPath(); g.ellipse(16, yy + 2.1, 1.6, 2, 0, 0, TAU); g.fill(); }
    g.strokeStyle = '#e2cf9a'; g.lineWidth = 1.4; for (const xx of [-9, 9]) { g.beginPath(); g.moveTo(xx, -11); g.lineTo(xx, 11); g.stroke(); }
    g.restore();
  }
  function canoe(g, x, y) {   // canoa scavata in un tronco, con il remo
    g.save(); g.translate(x, y); g.rotate(-0.12);
    g.fillStyle = 'rgba(10,40,70,.35)'; g.beginPath(); g.ellipse(2, 4, 30, 6, 0, 0, TAU); g.fill();
    g.fillStyle = '#7a4a24'; g.strokeStyle = INK; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-30, -2); g.quadraticCurveTo(0, 10, 30, -2); g.quadraticCurveTo(0, 2, -30, -2); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#4a2a12'; g.beginPath(); g.moveTo(-24, -1.5); g.quadraticCurveTo(0, 5, 24, -1.5); g.quadraticCurveTo(0, 1, -24, -1.5); g.fill();
    g.strokeStyle = '#c8955a'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(10, -14); g.lineTo(18, 8); g.stroke();
    g.fillStyle = '#c8955a'; g.beginPath(); g.ellipse(18.5, 9, 2.4, 4.5, -0.35, 0, TAU); g.fill();
    g.restore();
  }
  function trap(g, x, y) {   // trappola di caccia: recinto di pali appuntiti
    g.fillStyle = 'rgba(70,45,20,.35)'; g.beginPath(); g.ellipse(x, y, 22, 11, 0, 0, TAU); g.fill();
    g.fillStyle = '#4a3420'; g.beginPath(); g.ellipse(x, y, 15, 7, 0, 0, TAU); g.fill();
    const P = []; for (let i = 0; i < 11; i++) { const a = i / 11 * TAU; P.push([x + Math.cos(a) * 18, y + Math.sin(a) * 9]); }
    P.sort((a, b) => a[1] - b[1]);
    for (const [px, py] of P) { g.strokeStyle = INK; g.lineWidth = 3.4; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (x - px) * 0.12, py - 11); g.stroke(); g.strokeStyle = '#b07a44'; g.lineWidth = 2; g.stroke(); }
    g.strokeStyle = '#e2cf9a'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y - 6, 17, 8, 0, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
  }
  function pit(g, x, y) {   // fossa nascosta con le punte
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + 1, 20, 11, 0, 0, TAU); g.fill();
    const gr = g.createRadialGradient(x, y, 2, x, y, 18); gr.addColorStop(0, '#1e140a'); gr.addColorStop(1, '#5a3c1e');
    g.fillStyle = gr; g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, 18, 9.5, 0, 0, TAU); g.fill(); g.stroke();
    for (let i = 0; i < 9; i++) { const px = x - 12 + i * 3, py = y + 3 - Math.abs(i - 4) * 0.4; g.fillStyle = '#d8c290'; g.beginPath(); g.moveTo(px - 1.3, py); g.lineTo(px, py - 9 + (i % 2) * 2); g.lineTo(px + 1.3, py); g.fill(); }
    g.strokeStyle = 'rgba(120,160,60,.9)'; g.lineWidth = 1.4; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * 18, y + Math.sin(a) * 9.5); g.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 11 - 3); g.stroke(); }
  }
  function totemPole(g, x, y) {   // totem dello sciamano: palo intagliato con le piume
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 2, y + 1, 9, 3, 0, 0, TAU); g.fill();
    g.fillStyle = '#8b5a2b'; g.strokeStyle = INK; g.lineWidth = 1.3; g.beginPath(); g.roundRect(x - 5.5, y - 34, 11, 34, 3); g.fill(); g.stroke();
    for (const [yy, c] of [[-30, '#c0303a'], [-19, '#2f6fb0'], [-8, '#e8b33a']]) {
      g.fillStyle = c; g.fillRect(x - 5.5, yy, 11, 2.4);
      g.fillStyle = '#f3e7cc'; g.beginPath(); g.arc(x - 2.2, yy + 5, 1.3, 0, TAU); g.arc(x + 2.2, yy + 5, 1.3, 0, TAU); g.fill();
      g.fillStyle = INK; g.fillRect(x - 2.4, yy + 7.6, 4.8, 1.2);
    }
    for (const [dx, a, c] of [[-4, -0.6, '#c0303a'], [0, 0, '#f3e7cc'], [4, 0.6, '#2f6fb0']]) { g.save(); g.translate(x + dx, y - 34); g.rotate(a); g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 0.8; g.beginPath(); g.ellipse(0, -7, 2.4, 7.5, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
  }
  function obj(g, o) {
    const k = o.k;
    if (k === 'zattera') return raft(g, o.x, o.y);
    if (k === 'canoa') return canoe(g, o.x, o.y);
    if (k === 'rete') return trap(g, o.x, o.y);
    if (k === 'fossa') return pit(g, o.x, o.y);
    if (k === 'totem') return totemPole(g, o.x, o.y);
    if (k === 'ambra') amber(g, o.x, o.y);
    else if (k === 'ces') bush(g, o.x, o.y);
    else if (k === 'sas') { rock(g, o.x - 5, o.y, 5, 3.4); rock(g, o.x + 4, o.y + 2, 3.6, 2.6); rock(g, o.x + 1, o.y - 4, 2.6, 2); }
    else if (k === 'monte') mount(g, o.x, o.y);
    else if (k === 'falo') fire(g, o.x, o.y);
    else if (k === 'miele') hive(g, o.x, o.y);
    else if (k === 'pietre') stones(g, o.x, o.y);
    else animal(g, k, o.x, o.y, o.s || 0.9, o.f || 1);
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
    for (const o of ob) obj(g, o);
    g.restore();
    cache.set(key, cv);
    return cv;
  }

  const COLORS = { rosso: '#d8453a', blu: '#3a78d6', giallo: '#f0bf2c', verde: '#3fa24c', viola: '#8e5bd0' };
  window.VA = { S, tile, animal, amber, fish, meeple, hut, rotDef, forestF, COLORS, shade };
})();

// ==== LA VALLE DEI CLAN: schermo di gioco (window.VG) ====
// Mappa su un canvas che si ridisegna SOLO quando cambia qualcosa (niente requestAnimationFrame sempre acceso:
// il giro di disegno parte per le animazioni e si ferma da solo). Un dito trascina, due dita ingrandiscono.
if (typeof document !== 'undefined') (() => {
  const E = window.VE, A = window.VA, TB = 224;   // misura delle tessere in cache
  const COL = [A.COLORS.rosso, A.COLORS.blu, A.COLORS.giallo, A.COLORS.verde, A.COLORS.viola];
  const AIN = ['Nonna Selce', 'Zio Tuono', 'Piccola Lince', 'Vecchio Gufo'];
  const LEVELS = [{ n: 'Principiante', noise: 30 }, { n: 'Facile', noise: 15 }, { n: 'Medio', noise: 6 }, { n: 'Difficile', noise: 0 }];
  let U = null;

  const css = `
  #vgRoot{position:fixed;inset:0;z-index:90;background:radial-gradient(ellipse at 50% 40%,#4a3a2a,#1b140e);color:#f4ead8;font:15px system-ui,sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden}
  #vgRoot canvas.map{position:absolute;inset:0;width:100%;height:100%}
  #vgTop{position:absolute;left:0;right:0;top:0;display:flex;gap:5px;padding:8px 8px 0;pointer-events:none}
  .vgP{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:4px;background:rgba(20,14,8,.74);border:2px solid transparent;border-radius:12px;padding:3px 7px 3px 3px;transition:border-color .25s,transform .25s}
  .vgP>div{min-width:0;flex:1}
  .vgP.on{border-color:#ffd970;transform:translateY(1px)}
  .vgP canvas{width:20px;height:27px;flex:none}
  .vgP b{font-size:17px;text-align:right;flex:none}
  .vgP .nm{font-size:12px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .vgP .st{font-size:11px;opacity:.8;white-space:nowrap;display:flex;align-items:center;gap:2px}
  .vgP .st i{display:inline-block;width:10px;height:13px;background-size:contain;background-repeat:no-repeat;background-position:center;margin-right:3px}
  .vgP.bump b{animation:vgB .5s}
  @keyframes vgB{40%{transform:scale(1.5);color:#ffe27a}}
  #vgLeft{position:absolute;left:50%;transform:translateX(-50%);bottom:104px;background:rgba(20,14,8,.66);border-radius:10px;padding:3px 10px;font-size:12px;opacity:.9;pointer-events:none}
  #vgBot{position:absolute;left:8px;right:8px;bottom:8px;display:flex;align-items:center;gap:10px;background:rgba(20,14,8,.82);border-radius:16px;padding:8px;box-shadow:0 6px 20px rgba(0,0,0,.5)}
  #vgHand{width:76px;height:76px;flex:none;border-radius:6px;box-shadow:0 3px 10px rgba(0,0,0,.6);transition:transform .25s}
  #vgMsg{flex:1;font-size:14px;line-height:1.3}
  #vgMsg small{display:block;opacity:.7;font-size:12px;margin-top:2px}
  .vgBtns{display:flex;flex-direction:column;gap:6px}
  .vgBtn{background:#e9c46a;color:#2a1c0c;border:0;border-radius:11px;padding:9px 13px;font:600 14px system-ui;min-width:96px}
  .vgBtn.alt{background:rgba(255,255,255,.14);color:#f4ead8}
  .vgBtn:disabled{opacity:.35}
  #vgToast{position:absolute;left:50%;top:22%;transform:translate(-50%,-10px);background:rgba(20,14,8,.88);border:2px solid #ffd970;border-radius:14px;padding:10px 16px;font:600 16px system-ui;opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;text-align:center}
  #vgToast.on{opacity:1;transform:translate(-50%,0)}
  #vgPanel{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,7,4,.55)}
  #vgPanel .box{background:#2c2118;border-radius:18px;padding:18px;width:min(340px,88vw);box-shadow:0 10px 40px rgba(0,0,0,.6)}
  #vgPanel h2{margin:0 0 4px;font-size:22px}
  #vgPanel p{margin:4px 0 14px;opacity:.75;font-size:13px}
  .vgD{background:rgba(255,255,255,.08);border-radius:12px;margin:8px 0}
  .vgD summary{list-style:none;padding:11px 13px;display:flex;justify-content:space-between;font-weight:600}
  .vgD summary::-webkit-details-marker{display:none}
  .vgD summary span{opacity:.8;font-weight:400}
  .vgD .opts{display:flex;flex-wrap:wrap;gap:6px;padding:0 10px 10px}
  .vgD .opts button{background:rgba(255,255,255,.12);color:#f4ead8;border:0;border-radius:9px;padding:8px 11px;font:14px system-ui}
  .vgD .opts button.on{background:#e9c46a;color:#2a1c0c;font-weight:600}
  .vgRes{display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid rgba(255,255,255,.08)}
  .vgRes b{margin-left:auto;font-size:18px}
  #vgClose{position:absolute;left:10px;bottom:104px;background:rgba(20,14,8,.72);color:#f4ead8;border:0;border-radius:10px;padding:5px 11px;font:13px system-ui}
  `;

  // ---- piccola tela con l'omino di un colore (per le barre dei giocatori) ----
  let ICO = null;
  function icons() {
    if (ICO) return ICO;
    const mk = f => { const c = document.createElement('canvas'); c.width = 40; c.height = 52; const g = c.getContext('2d'); f(g); return c.toDataURL(); };
    ICO = { m: mk(g => A.meeple(g, 18, 47, '#d8cbb4', 'racc', 0.95)), h: mk(g => A.hut(g, 20, 48, '#d8cbb4', 0.9)) };
    return ICO;
  }
  function chip(col) { const c = document.createElement('canvas'); c.width = 44; c.height = 60; const g = c.getContext('2d'); g.scale(1.15, 1.15); A.meeple(g, 19, 48, col, 'racc', 0.95); return c; }

  function start(opt = {}) {
    if (!document.getElementById('vgCss')) { const s = document.createElement('style'); s.id = 'vgCss'; s.textContent = css; document.head.appendChild(s); }
    if (U) U.root.remove();
    const root = document.createElement('div'); root.id = 'vgRoot';
    root.innerHTML = '<canvas class="map"></canvas><div id="vgTop"></div><div id="vgLeft"></div><div id="vgToast"></div>' +
      '<button id="vgClose" type="button">Esci</button><div id="vgBot"><canvas id="vgHand" width="152" height="152"></canvas><div id="vgMsg"></div><div class="vgBtns"><button class="vgBtn" id="vgOk"></button><button class="vgBtn alt" id="vgAlt"></button></div></div>';
    document.body.appendChild(root);
    U = { root, cv: root.querySelector('canvas.map'), opt, G: null, cam: { x: 0.5, y: 0.5, z: 110 }, sel: null, mo: null, mopts: [], fl: [], evI: 0, busy: false, raf: 0, dirty: true, t0: performance.now() };
    U.g = U.cv.getContext('2d');
    addEventListener('resize', resize); resize();
    touch();
    root.querySelector('#vgOk').onclick = () => ok();
    root.querySelector('#vgAlt').onclick = () => alt();
    root.querySelector('#vgClose').onclick = () => { if (U.G && U.G.ph !== 'end' && U.G.tiles.length > 1 && !confirm('Lasci la partita?')) return; stop(); };
    setup();
  }

  // ---- scelte prima della partita (tendine, una aperta alla volta) ----
  function setup() {
    const S = U.set = U.set || { n: 1, lv: 2, s2: 1 };
    const p = panel(`<h2>La Valle dei Clan</h2><p>Metti le tessere, manda i tuoi omini nei boschi, nei fiumi e nei prati.</p>
      <details class="vgD" data-k="n"><summary>Avversari <span></span></summary><div class="opts"></div></details>
      <details class="vgD" data-k="lv"><summary>Livello <span></span></summary><div class="opts"></div></details>
      <details class="vgD" data-k="s2"><summary>Bosco di 2 tessere <span></span></summary><div class="opts"></div></details>
      <button class="vgBtn" style="width:100%;margin-top:10px" id="vgGo">Gioca</button><button class="vgBtn alt" style="width:100%;margin-top:8px" id="vgOut">Esci</button>`);
    p.querySelector('#vgOut').onclick = () => stop();
    const fill = () => p.querySelectorAll('.vgD').forEach(d => {
      const k = d.dataset.k, vals = k === 'n' ? [1, 2, 3, 4] : k === 's2' ? [1, 0] : [0, 1, 2, 3];
      const lab = v => k === 'n' ? (v === 1 ? '1 computer' : v + ' computer') : k === 's2' ? (v ? '2 punti' : '4 punti') : LEVELS[v].n;
      d.querySelector('summary span').textContent = lab(S[k]);
      d.querySelector('.opts').innerHTML = vals.map(v => `<button data-v="${v}" class="${v === S[k] ? 'on' : ''}">${lab(v)}</button>`).join('');
      d.querySelectorAll('.opts button').forEach(b => b.onclick = () => { S[k] = +b.dataset.v; d.open = false; fill(); });
    });
    p.querySelectorAll('.vgD').forEach(d => d.addEventListener('toggle', () => { if (d.open) p.querySelectorAll('.vgD').forEach(o => { if (o !== d) o.open = false; }); }));
    fill();
    p.querySelector('#vgGo').onclick = () => { closePanel(); newGame(); };
  }
  function panel(html) { closePanel(); const d = document.createElement('div'); d.id = 'vgPanel'; d.innerHTML = '<div class="box">' + html + '</div>'; U.root.appendChild(d); return d; }
  function closePanel() { const d = U.root.querySelector('#vgPanel'); if (d) d.remove(); }

  function newGame() {
    const n = U.set.n + 1, names = [U.opt.name || 'Tu', ...AIN.slice(0, n - 1)];
    U.G = E.newGame({ n, seed: (Math.random() * 1e9) | 0, names, small2: !!U.set.s2 });
    U.ai = [false, ...Array(n - 1).fill(true)];
    U.evI = U.G.ev.length; U.sel = null; U.mo = null; U.fl = []; U.cam = { x: 0.5, y: 0.5, z: Math.min(130, Math.min(U.W, U.H) / 4.2) };
    bars(); flow();
  }

  // ---- giro della partita ----
  // cerchi delle scelte: partono dal punto della zona e si allontanano tra loro finche' non si toccano piu'
  const OPT_D = 50;   // distanza minima tra i centri (unita' della tessera; il cerchio ha raggio 21)
  function layoutOpts(t) {
    const P = U.mopts.map(o => { const p = optPt(t, o); return [E.clamp(p[0], 26, 174), E.clamp(p[1], 26, 174)]; });
    for (let it = 0; it < 80; it++) {
      let moved = false;
      for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
        let dx = P[b][0] - P[a][0], dy = P[b][1] - P[a][1], d = Math.hypot(dx, dy);
        if (d >= OPT_D) continue;
        if (d < 0.01) { dx = 1; dy = 0.3; d = Math.hypot(dx, dy); }
        const push = (OPT_D - d) / 2 + 0.5, ux = dx / d, uy = dy / d;
        P[a][0] -= ux * push; P[a][1] -= uy * push; P[b][0] += ux * push; P[b][1] += uy * push; moved = true;
      }
      for (const p of P) { p[0] = E.clamp(p[0], 26, 174); p[1] = E.clamp(p[1], 26, 174); }
      if (!moved) break;
    }
    U.optPos = P;
  }
  function zoomTo(t) {   // la tessera appena messa ben grande al centro, per scegliere con comodo
    U.zBack = U.cam.z;
    U.cam.z = Math.max(U.cam.z, Math.min(240, Math.min(U.W, U.H - 190) / 1.9));
    U.cam.x = t.x + 0.5; U.cam.y = t.y + 0.5;
  }
  function flow() {
    const G = U.G; U.sel = null; U.mo = null; U.mopts = []; U.optPos = null;
    if (U.zBack) { U.cam.z = U.zBack; U.zBack = 0; }
    eventsShow();
    bars();
    if (G.ph === 'end') { setTimeout(results, 1400); hand(null); msg('Fine della partita', 'Si contano i prati e le palafitte'); buttons(); redraw(); return; }
    hand(G.hand, 0);
    if (U.ai[G.cur]) {
      msg(G.P[G.cur].n + ' sta pensando…', G.bon ? 'Tessera speciale' : ''); buttons(); redraw();
      U.busy = true;
      setTimeout(() => {
        const m = E.aiMove(G, { noise: LEVELS[U.set.lv].noise, seed: G.seed });
        U.sel = { x: m.x, y: m.y, rs: [m.r], ri: 0, ai: 1, t: performance.now() }; hand(G.hand, m.r); redraw();
        setTimeout(() => {
          E.place(G, m.x, m.y, m.r); U.sel = null; follow(m.x, m.y);
          setTimeout(() => { E.meeple(G, m.m); if (G.ph === 'totem') E.totem(G, m.sh); U.busy = false; flow(); }, m.m ? 520 : 260);
          redraw();
        }, 650);
      }, 550 + Math.random() * 350);
      return;
    }
    U.busy = false;
    if (G.ph === 'totem') { msg('Sciamano: vuoi riprenderti un omino?', 'Tocca un tuo omino sulla mappa, oppure Nessuno'); buttons(); redraw(); return; }
    U.spots = E.spots(G);
    const spn = E.SPN[E.byId[G.hand].sp];
    if (spn) msg('Tessera speciale: ' + spn[0], spn[1]); else msg(G.bon ? 'Tessera speciale!' : 'Tocca a te', 'Tocca un posto illuminato');
    buttons(); redraw();
  }
  function msg(a, b) { U.root.querySelector('#vgMsg').innerHTML = a + (b ? '<small>' + b + '</small>' : ''); }
  function buttons() {
    const ok = U.root.querySelector('#vgOk'), al = U.root.querySelector('#vgAlt'), G = U.G;
    const mine = G && !U.ai[G.cur] && !U.busy && G.ph !== 'end';
    ok.style.display = al.style.display = mine ? '' : 'none';
    if (!mine) return;
    if (G.ph === 'tile') { ok.textContent = 'Conferma'; ok.disabled = !U.sel; al.textContent = 'Gira'; al.disabled = !U.sel || U.sel.rs.length < 2; }
    else if (G.ph === 'totem') { ok.textContent = 'Riprendi'; ok.disabled = !U.mo; al.textContent = 'Nessuno'; al.disabled = false; }
    else { ok.textContent = U.mo ? (U.mo.k === 'hut' ? 'Metti la palafitta' : 'Metti l\'omino') : 'Avanti'; ok.disabled = false; al.textContent = 'Nessuno'; al.disabled = !U.mo; }
  }
  function ok() {
    const G = U.G; if (U.busy || U.ai[G.cur]) return;
    if (G.ph === 'tile' && U.sel) {
      const s = U.sel; E.place(G, s.x, s.y, s.rs[s.ri]); U.sel = null; hand(null);
      U.mopts = E.meepleOpts(G); U.mo = null; layoutOpts(G.tiles[G.last]); zoomTo(G.tiles[G.last]);
      if (!U.mopts.length) { E.meeple(G, null); U.mo = null; flow(); return; }
      msg('Vuoi mettere un omino?', 'Tocca un cerchio sulla tessera, oppure Avanti'); buttons(); redraw();
    } else if (G.ph === 'meeple') { E.meeple(G, U.mo); U.mo = null; flow(); }
    else if (G.ph === 'totem' && U.mo) { E.totem(G, U.mo); U.mo = null; flow(); }
  }
  function alt() {
    const G = U.G; if (U.busy) return;
    if (G.ph === 'tile' && U.sel) { U.sel.ri = (U.sel.ri + 1) % U.sel.rs.length; hand(G.hand, U.sel.rs[U.sel.ri]); redraw(); }
    else if (G.ph === 'meeple') { U.mo = null; buttons(); redraw(); }
    else if (G.ph === 'totem') { E.totem(G, null); U.mo = null; flow(); }
  }
  function tapAt(sx, sy) {
    const G = U.G; if (!G || U.busy || U.ai[G.cur] || G.ph === 'end') return;
    const [wx, wy] = toWorld(sx, sy), tx = Math.floor(wx), ty = Math.floor(wy);
    if (G.ph === 'tile') {
      if (U.sel && U.sel.x === tx && U.sel.y === ty) { alt(); return; }
      const s = U.spots.find(s => s.x === tx && s.y === ty);
      if (s) { U.sel = { x: tx, y: ty, rs: s.r, ri: 0 }; hand(G.hand, s.r[0]); msg('Gira o conferma', s.r.length > 1 ? 'Tocca ancora la tessera per girarla' : 'Va bene solo cosi\''); buttons(); redraw(); }
    } else if (G.ph === 'meeple') {
      const t = G.tiles[G.last]; let best = null, bd = 0.2;
      U.mopts.forEach((o, k) => { const p = U.optPos ? U.optPos[k] : optPt(t, o), d = Math.hypot(wx - t.x - p[0] / 200, wy - t.y - p[1] / 200); if (d < bd) { bd = d; best = o; } });
      if (best) { U.mo = U.mo && U.mo.j === best.j && U.mo.k === best.k ? null : best; buttons(); redraw(); }
    } else if (G.ph === 'totem') {
      let best = null, bd = 0.25;
      for (const m of G.shOpts) { const t = G.tiles[m.i], p = optPt(t, m), d = Math.hypot(wx - t.x - p[0] / 200, wy - t.y - p[1] / 200); if (d < bd) { bd = d; best = m; } }
      if (best) { U.mo = U.mo === best ? null : best; buttons(); redraw(); }
    }
  }
  const optPt = (t, o) => { const p = t.F[o.j].pt; return o.k === 'hut' && t.F[o.j].k === 'f' ? [p[0] + 14, p[1] + 10] : p; };

  // ---- barre dei giocatori ----
  function bars() {
    const G = U.G, top = U.root.querySelector('#vgTop'); if (!G) { top.innerHTML = ''; return; }
    if (top.children.length !== G.P.length) {
      top.innerHTML = '';
      G.P.forEach((p, i) => { const d = document.createElement('div'); d.className = 'vgP'; d.appendChild(chip(COL[i])); d.insertAdjacentHTML('beforeend', '<div><div class="nm"></div><div class="st"></div></div><b>0</b>'); top.appendChild(d); });
    }
    G.P.forEach((p, i) => {
      const d = top.children[i], b = d.querySelector('b');
      d.classList.toggle('on', i === G.cur && G.ph !== 'end');
      d.querySelector('.nm').textContent = p.n;
      const I = icons(); d.querySelector('.st').innerHTML = p.men + '<i style="background-image:url(' + I.m + ')"></i>' + p.huts + '<i style="background-image:url(' + I.h + ')"></i>';
      if (+b.textContent !== p.sc) { b.textContent = p.sc; d.classList.remove('bump'); void d.offsetWidth; d.classList.add('bump'); }
    });
    U.root.querySelector('#vgLeft').textContent = G.deck.length + (G.deck.length === 1 ? ' tessera' : ' tessere') + ' nel mazzo';
  }
  function hand(id, r) {
    const c = U.root.querySelector('#vgHand'), g = c.getContext('2d'); g.clearRect(0, 0, 152, 152);
    c.style.visibility = id ? 'visible' : 'hidden'; if (!id) return;
    g.drawImage(A.tile(E.byId[id], r || 0, 152), 0, 0);
  }
  function toast(t, ms = 1800) { const d = U.root.querySelector('#vgToast'); d.textContent = t; d.classList.add('on'); clearTimeout(U.tt); U.tt = setTimeout(() => d.classList.remove('on'), ms); }

  // ---- cose successe: punti che volano, speciali ----
  const NAMEK = { b: 'Bosco chiuso', f: 'Fiume chiuso', p: 'Prato', h: 'Palafitta', canoa: 'Canoa', rete: 'Trappola' };
  function eventsShow() {
    const G = U.G;
    for (; U.evI < G.ev.length; U.evI++) {
      const e = G.ev[U.evI];
      if (e.t === 'score') {
        const i = (e.g / 16) | 0, j = e.g % 16, t = G.tiles[i], p = t.F[j].pt;
        U.fl.push({ x: t.x + p[0] / 200, y: t.y + p[1] / 200, txt: (e.win.length ? '+' + e.pts : '0'), sub: NAMEK[e.k], col: e.win.length ? COL[e.win[0]] : '#aaa', t: performance.now() + (e.end ? (U.fl.length * 700) : 0) });
      } else if (e.t === 'bonus') toast('Ambra! ' + G.P[e.p].n + ' pesca una tessera speciale');
    }
    if (U.fl.length) loop();
  }
  function results() {
    const G = U.G, ord = G.P.map((p, i) => ({ p, i })).sort((a, b) => b.p.sc - a.p.sc);
    const won = ord[0].i === 0 || ord[0].p.sc === G.P[0].sc;
    const p = panel(`<h2>${won ? 'Hai vinto!' : ord[0].p.n + ' vince'}</h2><p>La valle e' completa.</p>` +
      ord.map(o => `<div class="vgRes"><canvas width="44" height="60" style="width:22px;height:30px"></canvas>${o.p.n}<b>${o.p.sc}</b></div>`).join('') +
      '<button class="vgBtn" style="width:100%;margin-top:14px" id="vgAgain">Rivincita</button><button class="vgBtn alt" style="width:100%;margin-top:8px" id="vgSet">Cambia scelte</button>');
    p.querySelectorAll('.vgRes canvas').forEach((c, k) => { const g = c.getContext('2d'); g.scale(1.15, 1.15); A.meeple(g, 19, 48, COL[ord[k].i], 'racc', 0.95); });
    p.querySelector('#vgAgain').onclick = () => { closePanel(); newGame(); };
    p.querySelector('#vgSet').onclick = () => setup();
  }

  // ---- mappa ----
  function resize() { const d = Math.min(3, devicePixelRatio || 1); U.dpr = d; U.W = innerWidth; U.H = innerHeight; U.cv.width = U.W * d; U.cv.height = U.H * d; redraw(); }
  const toScreen = (wx, wy) => [U.W / 2 + (wx - U.cam.x) * U.cam.z, U.H / 2 - 40 + (wy - U.cam.y) * U.cam.z];
  const toWorld = (sx, sy) => [U.cam.x + (sx - U.W / 2) / U.cam.z, U.cam.y + (sy - U.H / 2 + 40) / U.cam.z];
  function follow(x, y) {   // tiene in vista la tessera appena messa
    const [sx, sy] = toScreen(x + 0.5, y + 0.5), m = U.cam.z * 0.7;
    if (sx < m || sx > U.W - m || sy < 70 + m || sy > U.H - 110 - m) { U.cam.x += (x + 0.5 - U.cam.x) * 0.6; U.cam.y += (y + 0.5 - U.cam.y) * 0.6; }
  }
  function redraw() { U.dirty = true; loop(); }
  function loop() { if (!U.raf) U.raf = requestAnimationFrame(frame); }
  function frame(now) {
    U.raf = 0;
    const anim = render(now);
    if (anim) loop();
  }
  function render(now) {
    const g = U.g, d = U.dpr, z = U.cam.z, G = U.G;
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, U.W, U.H);
    if (!G) return false;
    let anim = false;
    const k = z / 200, tileT = (x, y) => { const [sx, sy] = toScreen(x, y); g.setTransform(d * k, 0, 0, d * k, sx * d, sy * d); };
    // ombra sotto le tessere
    g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 14 * d; g.shadowOffsetY = 4 * d; g.fillStyle = '#000';
    for (const t of G.tiles) { const [sx, sy] = toScreen(t.x, t.y); if (sx > U.W || sy > U.H || sx + z < 0 || sy + z < 0) continue; g.fillRect(sx + 1, sy + 1, z - 2, z - 2); }
    g.restore();
    for (const t of G.tiles) {
      const [sx, sy] = toScreen(t.x, t.y); if (sx > U.W || sy > U.H || sx + z < 0 || sy + z < 0) continue;
      g.drawImage(A.tile(E.byId[t.id], t.r, TB), sx, sy, z + 0.6, z + 0.6);
    }
    g.strokeStyle = 'rgba(0,0,0,.10)'; g.lineWidth = 0.7;
    for (const t of G.tiles) { const [sx, sy] = toScreen(t.x, t.y); g.strokeRect(sx + 0.35, sy + 0.35, z - 0.7, z - 0.7); }
    // posti illuminati (turno mio)
    const pulse = 0.5 + 0.5 * Math.sin(now / 380);
    if (G.ph === 'tile' && !U.ai[G.cur] && U.spots && !U.busy) {
      for (const s of U.spots) {
        if (U.sel && U.sel.x === s.x && U.sel.y === s.y) continue;
        const [sx, sy] = toScreen(s.x, s.y);
        g.save(); g.shadowColor = 'rgba(255,214,90,.9)'; g.shadowBlur = 12 * d;
        g.fillStyle = `rgba(255,226,120,${0.1 + 0.08 * pulse})`; g.beginPath(); g.roundRect(sx + z * 0.06, sy + z * 0.06, z * 0.88, z * 0.88, z * 0.1); g.fill();
        g.setLineDash([z * 0.09, z * 0.06]); g.strokeStyle = 'rgba(255,222,110,.95)'; g.lineWidth = 2; g.stroke(); g.restore();
      }
      anim = true;
    }
    // tessera scelta (mia o del computer)
    if (U.sel && G.hand) {
      const s = U.sel, [sx, sy] = toScreen(s.x, s.y), r = s.rs[s.ri];
      const a = s.ai ? Math.min(1, (now - s.t) / 300) : 1, sc = s.ai ? 0.85 + 0.15 * a : 1;
      g.save(); g.globalAlpha = a; g.shadowColor = 'rgba(255,214,90,.95)'; g.shadowBlur = 18 * d;
      const w = z * sc, o = (z - w) / 2;
      g.drawImage(A.tile(E.byId[G.hand], r, TB), sx + o, sy + o, w, w); g.restore();
      g.strokeStyle = '#ffd970'; g.lineWidth = 2.5; g.strokeRect(sx + o, sy + o, w, w);
      if (a < 1) anim = true;
      if (!s.ai && s.rs.length > 1) { g.fillStyle = 'rgba(20,14,8,.7)'; g.beginPath(); g.arc(sx + z - 14, sy + 14, 11, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#ffd970'; g.lineWidth = 2; g.beginPath(); g.arc(sx + z - 14, sy + 14, 6, -2.4, 1.9); g.stroke(); g.beginPath(); g.moveTo(sx + z - 14 + 6 * Math.cos(1.9) + 3, sy + 14 + 6 * Math.sin(1.9) - 1); g.lineTo(sx + z - 14 + 6 * Math.cos(1.9), sy + 14 + 6 * Math.sin(1.9)); g.lineTo(sx + z - 14 + 6 * Math.cos(1.9) - 1, sy + 14 + 6 * Math.sin(1.9) - 4); g.stroke(); }
    }
    // omini e palafitte
    const P = E.pieces(G).sort((a, b) => (G.tiles[a.i].y - G.tiles[b.i].y) || (G.tiles[a.i].F[a.j].pt[1] - G.tiles[b.i].F[b.j].pt[1]));
    for (const m of P) {
      const t = G.tiles[m.i], f = t.F[m.j], p = optPt(t, m); tileT(t.x, t.y);
      if (m.k === 'hut') A.hut(g, p[0], p[1] + 14, COL[m.p], 1.05);
      else A.meeple(g, p[0], p[1] + 16, COL[m.p], f.k === 'p' ? 'cacc' : f.k === 'b' ? 'racc' : 'pesca', 1.05);
    }
    // sciamano: anello sui miei omini
    if (G.ph === 'totem' && !U.ai[G.cur] && G.shOpts) {
      for (const m of G.shOpts) {
        const t = G.tiles[m.i], p = optPt(t, m), on = U.mo === m; tileT(t.x, t.y);
        g.strokeStyle = on ? '#ffd970' : `rgba(255,255,255,${0.5 + 0.4 * pulse})`; g.lineWidth = on ? 7 : 4;
        g.beginPath(); g.arc(p[0], p[1] + 4, 26, 0, Math.PI * 2); g.stroke();
      }
      anim = true;
    }
    // scelta dell'omino sulla tessera appena messa
    if (G.ph === 'meeple' && !U.ai[G.cur]) {
      const t = G.tiles[G.last];
      U.mopts.forEach((o, k) => {
        const p = U.optPos ? U.optPos[k] : optPt(t, o), on = U.mo && U.mo.j === o.j && U.mo.k === o.k; tileT(t.x, t.y);
        if (on) { o.k === 'hut' ? A.hut(g, p[0], p[1] + 14, COL[G.cur], 1.05) : A.meeple(g, p[0], p[1] + 16, COL[G.cur], t.F[o.j].k === 'p' ? 'cacc' : t.F[o.j].k === 'b' ? 'racc' : 'pesca', 1.05); return; }
        g.fillStyle = `rgba(255,255,255,${0.55 + 0.25 * pulse})`; g.strokeStyle = COL[G.cur]; g.lineWidth = 5;
        g.beginPath(); g.arc(p[0], p[1], 21, 0, Math.PI * 2); g.fill(); g.stroke();
        g.save(); g.globalAlpha = 0.75; o.k === 'hut' ? A.hut(g, p[0], p[1] + 9, COL[G.cur], 0.55) : (t.F[o.j].k === 'p' ? A.meeple(g, p[0] - 4, p[1] + 4, COL[G.cur], 'cacc', 0.55) : A.meeple(g, p[0] - 1, p[1] + 11, COL[G.cur], t.F[o.j].k === 'b' ? 'racc' : 'pesca', 0.6)); g.restore();
      });
      anim = true;
    }
    // punti che volano
    g.setTransform(d, 0, 0, d, 0, 0);
    U.fl = U.fl.filter(f => now - f.t < 1700);
    for (const f of U.fl) {
      const a = (now - f.t) / 1700; if (a < 0) { anim = true; continue; }
      const [sx, sy] = toScreen(f.x, f.y), y = sy - 18 - a * 46;
      g.globalAlpha = a < 0.8 ? 1 : (1 - a) / 0.2;
      g.font = '800 26px system-ui'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(20,14,8,.85)'; g.strokeText(f.txt, sx, y); g.fillStyle = f.col; g.fillText(f.txt, sx, y);
      g.font = '600 12px system-ui'; g.lineWidth = 4; g.strokeText(f.sub, sx, y + 16); g.fillStyle = '#fff'; g.fillText(f.sub, sx, y + 16);
      g.globalAlpha = 1; g.textAlign = 'left'; anim = true;
    }
    return anim;
  }

  // ---- gesti: un dito trascina, due ingrandiscono, tocco = scelta ----
  function touch() {
    const pts = new Map(); let moved = 0, last = null, pinch = null;
    const cv = U.cv;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 1) { moved = 0; last = [e.clientX, e.clientY]; } if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: U.cam.z }; moved = 99; } });
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()], dd = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const [wx, wy] = toWorld(mx, my); U.cam.z = E.clamp(pinch.z * dd / pinch.d, 45, 260);
        const [nx, ny] = toWorld(mx, my); U.cam.x += wx - nx; U.cam.y += wy - ny; redraw(); return;
      }
      if (pts.size === 1 && last) {
        const dx = e.clientX - last[0], dy = e.clientY - last[1]; moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 8) { U.cam.x -= dx / U.cam.z; U.cam.y -= dy / U.cam.z; redraw(); }
        last = [e.clientX, e.clientY];
      }
    });
    const up = e => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { if (moved <= 8) tapAt(e.clientX, e.clientY); last = null; } else last = [...pts.values()][0]; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); const [wx, wy] = toWorld(e.clientX, e.clientY); U.cam.z = E.clamp(U.cam.z * (e.deltaY < 0 ? 1.12 : 0.89), 45, 260); const [nx, ny] = toWorld(e.clientX, e.clientY); U.cam.x += wx - nx; U.cam.y += wy - ny; redraw(); }, { passive: false });
  }

  function stop() { if (!U) return; removeEventListener('resize', resize); if (U.raf) cancelAnimationFrame(U.raf); U.root.remove(); const cb = U.opt.onExit; U = null; if (cb) cb(); }
  window.VG = { start, stop, get U() { return U; }, tapAt, ok, alt, toScreen };
})();
