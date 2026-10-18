// Naufraghi sull'isola misteriosa (a squadre). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Usa i MODULI COMUNI (giochi/lib): squadre (squadre, voce, cerchio, freccia, fine), oggetti (pezzi da portare), mappe (isola col seme), indizi (frasi sui posti).
// Due squadre, Granchi e Delfini, naufragate su spiagge opposte di un'isola rotonda (diversa a ogni partita) con gli squali nel mare intorno.
// Ognuna costruisce una ZATTERA al suo campo: 4 tronchi (tanti in giro), 2 corde (5 in tutta l'isola), la VELA (una sola, fuori) e la BUSSOLA
// (una sola, nel cuore delle rovine). Vince chi salpa per primo; a tempo scaduto chi ha montato piu' pezzi. Un pezzo alla volta in mano (tronchi pesanti).
// Si ruba tutto: da terra, toccando chi porta un pezzo (lo fa cadere) e dalla zattera nemica (3 s fermi). Avversari si accoltellano ovunque:
// 2 vite, poi fantasma (guarda ma non parla). Vicino a un cespuglio o a una grande roccia "Nasconditi": i nemici non ti vedono finche' non ti muovi.
// L'isola sale al centro a gradini (per ora disegnati come rocce con le rampe): spiaggia e giungla, collina, cima con la statua, il FORZIERE
// (3 monete, poi si richiude) e il MERCANTE (scarpe veloci, pistola, mappa del tesoro). A meta' collina due ingressi delle ROVINE (livello a parte, al buio):
// ogni ingresso porta a una meta' (speculari): porta tenuta aperta da una pedana + leva oltre la porta, poi due pedane insieme, poi la porta
// a INGRANAGGI (enigma) che da' sulla stanza della bussola, l'unica in comune. A meta' partita scende la notte: torce sempre accese.
CQ_WAIT.naufraghi = cqLib('squadre', 'oggetti', 'mappe', 'indizi').then(L => {
  const SQ = L.squadre, OB = L.oggetti, MG = L.mappe, IZ = L.indizi;
  const N = 128, C = 64, RX = 130, RY = 2;   // isola 128x128 col centro in 64,64 (il mare aperto e' lo sfondo blu, non caselle); le rovine a parte, a destra (lontane: dall'isola non si vedono)
  const REACH = 1.2, KCD = 6, JAIL = 5, SAFE = 2.5, LIVES = 2, TOUCH = 0.7, PICK = 0.8, RAFT_R = 1.9, STEAL_T = 3, CHEST_T = 3, CHEST_CD = 45, CHEST_N = 3;
  const GUN = 6, FAST_T = 40, MAP_T = 20, SAIL_T = 6, SEE_N = 4.2, SEEN_T = 11, RUIN_SEE = 2.6, COVER = 1.5;
  const NEED = { log: 4, rope: 2, sail: 1, comp: 1 }, ORDER = ['comp', 'sail', 'rope', 'log'], SHOW = ['log', 'rope', 'sail', 'comp'];   // SHOW: ordine nella ricetta
  const CHOP_T = 2, REGROW = 90, LOGS = 20, OPT = { steal: 3, chest: 3, chop: 2 }, OPN = { steal: 1, chest: 2, chop: 3 };   // taglio: 2 s fermo, l'albero ricresce dopo 90 s; LOGS tronchi pronti (nascosti finche' non si taglia)
  const SHOP = [['fast', '👟 Scarpe veloci', 3, '+30% di velocità per ' + FAST_T + ' secondi.'], ['gun', '🔫 Pistola', 5, 'Colpisce un nemico fino a ' + GUN + ' caselle, 2 colpi. Lo sparo si sente!'], ['map', '🗺️ Mappa del tesoro', 3, 'Per ' + MAP_T + ' secondi la tua squadra vede dove sono corde e vela.']];
  const RUIN = '#7d745f';
  const TEAMS = [{ n: 'Granchi', f: 'dei Granchi', c: '#e0604a', l: '#ff9a85', e: '🦀' }, { n: 'Delfini', f: 'dei Delfini', c: '#3a9ad0', l: '#8fd0f5', e: '🐬' }];
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const MP = () => CQ_MAP;
  const P = c => cqModePos(c);
  const dist = (a, b) => { const p = P(a), q = P(b); return Math.hypot(p.x - q.x, p.y - q.y); };
  const dxy = (c, x, y) => { const p = P(c); return Math.hypot(p.x - x, p.y - y); };
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const jailed = (G, c) => (c.jail || 0) > G.time;
  const active = G => G.chars.filter(c => c.alive && !jailed(G, c));
  const lvl = x => x >= RX ? 1 : 0;
  const roomAt = (x, y) => { const r = cqRoomOf[Math.floor(y)]; return r ? r[Math.floor(x)] : -1; };
  const held = (G, c) => OB.held(G, c);
  const need = (G, t, k) => NEED[k] - OB.count(G, t, k) - G.it.filter(i => i.st === 1 && i.k === k && (byId(G, i.c) || {}).t === t).length;
  const pieces = (G, t) => ORDER.reduce((s, k) => s + Math.min(NEED[k], OB.count(G, t, k)), 0);
  const TOT = ORDER.reduce((s, k) => s + NEED[k], 0);
  const dark = G => Math.max(0, Math.min(1, ((G.opt.time - G.left) / G.opt.time - 0.5) / 0.08));
  const fastOn = (G, c) => (c.fast || 0) > G.time;

  // ======================= PEZZI DELLA ZATTERA (modulo oggetti) =======================
  const logD = (g, X, Y, TW) => { const u = TW / 34; g.save(); g.translate(X, Y - 5 * u); g.rotate(-0.45); g.fillStyle = '#7a5232'; g.fillRect(-15 * u, -4 * u, 30 * u, 8 * u); g.fillStyle = '#d8b07a'; g.beginPath(); g.ellipse(15 * u, 0, 2.6 * u, 4 * u, 0, 0, 7); g.fill(); g.fillStyle = '#5a3a24'; g.fillRect(-12 * u, -1 * u, 20 * u, 1.4 * u); g.restore(); };
  const ropeD = (g, X, Y, TW) => { const u = TW / 34; g.strokeStyle = '#d8c08a'; g.lineWidth = 3 * u; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(X, Y - (5 + i * 3) * u, (10 - i) * u, (4.5 - i * 0.6) * u, 0, 0, 7); g.stroke(); } g.strokeStyle = '#a8905a'; g.lineWidth = 1.2 * u; g.beginPath(); g.ellipse(X, Y - 8 * u, 7 * u, 3 * u, 0, 0, 7); g.stroke(); };
  const sailD = (g, X, Y, TW) => { const u = TW / 34; g.fillStyle = '#efe6cf'; g.beginPath(); g.moveTo(X - 13 * u, Y - 3 * u); g.lineTo(X + 12 * u, Y - 7 * u); g.lineTo(X + 4 * u, Y - 18 * u); g.closePath(); g.fill(); g.fillStyle = '#c9b88f'; g.beginPath(); g.moveTo(X - 13 * u, Y - 3 * u); g.lineTo(X + 12 * u, Y - 7 * u); g.lineTo(X + 10 * u, Y - 4 * u); g.closePath(); g.fill(); g.strokeStyle = '#7a5232'; g.lineWidth = 2.4 * u; g.beginPath(); g.moveTo(X - 15 * u, Y - 1 * u); g.lineTo(X + 15 * u, Y - 8 * u); g.stroke(); };
  const compD = (g, X, Y, TW, t) => { const u = TW / 34, y = Y - 8 * u; g.fillStyle = 'rgba(255,220,120,.35)'; g.beginPath(); g.arc(X, y, 13 * u, 0, 7); g.fill(); g.fillStyle = '#b8862a'; g.beginPath(); g.arc(X, y, 8 * u, 0, 7); g.fill(); g.fillStyle = '#f4ecd2'; g.beginPath(); g.arc(X, y, 6 * u, 0, 7); g.fill(); const a = Math.sin((t || 0) * 2) * 0.5; g.fillStyle = '#d8402a'; g.beginPath(); g.moveTo(X + Math.sin(a) * 5 * u, y - Math.cos(a) * 5 * u); g.lineTo(X + Math.cos(a) * 1.6 * u, y + Math.sin(a) * 1.6 * u); g.lineTo(X - Math.cos(a) * 1.6 * u, y - Math.sin(a) * 1.6 * u); g.fill(); };
  OB.kind('log', { n: 'tronco', a: 'il tronco', e: '🪵', w: 0.82, draw: logD });
  OB.kind('rope', { n: 'corda', a: 'la corda', e: '🪢', w: 1, draw: ropeD });
  OB.kind('sail', { n: 'vela', a: 'la vela', e: '⛵', w: 0.92, draw: sailD });
  OB.kind('comp', { n: 'bussola', a: 'la bussola', e: '🧭', w: 1, draw: compD });

  // ======================= MAPPA: l'isola (col seme) e le rovine =======================
  // ter[y][x]: 0 mare aperto, 1 mare basso, 2 sabbia, 3 giungla, 4 collina, 5 cima, 255 fuori dall'isola.
  // hz[y][x]: livello (altezze del motore): collina a campana fino a 7 gradini al centro; due pareti di roccia con gli ingressi delle miniere (rovine)
  function mapIsola(seed) { let M = null; for (let k = 0; k < 8 && !(M && M.ok); k++) M = build((seed | 0) * 7 + k); return M; }
  function build(seed) {
    const rnd = MG.rnd(seed), W = RX + 40, H = N;
    const a0 = rnd() * Math.PI * 2, wob = MG.wobble(rnd, 3, 0.11), wobH = MG.wobble(rnd, 3, 0.12);
    const R = a => 41 * wob(a);
    const ad = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    const ter = [], hz = []; for (let y = 0; y < H; y++) { ter.push(new Uint8Array(W).fill(255)); hz.push(new Uint8Array(W)); }
    const AD = (x, y) => [Math.hypot(x + 0.5 - C, y + 0.5 - C), Math.atan2(y + 0.5 - C, x + 0.5 - C)];
    const bell = (d, a) => Math.max(0, Math.min(7, Math.round(7.5 * Math.exp(-Math.pow(d / wobH(a) / 21, 2)) - 0.4)));
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const [d, a] = AD(x, y), r = R(a);
      if (d >= r + 4) continue;
      if (d >= r - 3) { ter[y][x] = d >= r + 2.5 ? 0 : d >= r ? 1 : 2; continue; }
      const L = bell(d, a); hz[y][x] = L; ter[y][x] = L >= 6 ? 5 : L >= 4 ? 4 : 3;
    }
    const pol = (a, d) => [Math.floor(C + Math.cos(a) * d), Math.floor(C + Math.sin(a) * d)];
    // ---- ingressi delle rovine: una parete di roccia a meta' collina (gradino di 2) con l'imbocco della miniera, uno per lato ----
    const mouths = [0, 1].map(h => {
      const a = a0 + h * Math.PI + 0.38; let dm = 6; while (dm < 30 && bell(dm, a) > 3) dm += 0.5;
      const top = bell(dm - 1, a), low = Math.max(0, top - 2);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const [d, b] = AD(x, y); if (d >= dm && d < dm + 3.4 && ad(b, a) * d < 3.4 && ter[y][x] >= 3) hz[y][x] = Math.min(hz[y][x], low); }
      const [mx, my] = pol(a, dm + 0.5), [tx, ty] = pol(a, dm + 1.7), [ox, oy] = pol(a, dm + 2.9);
      return { h, a, x: mx, y: my, tx, ty, ox: ox + 0.5, oy: oy + 0.5, z: low };
    });
    const land = (x, y) => x >= 0 && y >= 0 && x < N && y < N && ter[y][x] >= 2 && ter[y][x] <= 5;
    const props = [], taken = new Set(), K = (x, y) => x + ',' + y, pp = (t, x, y, o) => { props.push([t, x, y, o]); taken.add(K(x, y)); };
    const free = (x, y) => land(x, y) && !taken.has(K(x, y));
    const step = (ax, ay, bx, by) => Math.abs(hz[by][bx] - hz[ay][ax]) <= 1;
    const decals = [], deco = [], trees = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ter[y][x] <= 1) pp('sea', x, y);
    // ---- campi delle squadre su spiagge opposte: zattera sulla sabbia, tenda, falo', casse, bandiera ----
    // sulla sabbia o in giungla: se il punto cade in acqua si scende verso il centro
    const inland = (x, y, a) => { for (let i = 0; i < 6 && !(ter[y] && ter[y][x] >= 2 && ter[y][x] <= 3); i++) { x = Math.round(x - Math.cos(a)); y = Math.round(y - Math.sin(a)); } return [x, y]; };
    const camps = [0, 1].map(t => {
      const a = a0 + t * Math.PI, r = R(a), [cx, cy] = pol(a, r - 9), [rx, ry] = inland(...pol(a, r - 1.8), a), px = -Math.sin(a), py = Math.cos(a);
      return { t, a, x: cx + 0.5, y: cy + 0.5, cx, cy, rx, ry, tent: inland(Math.round(cx + px * 3), Math.round(cy + py * 3), a), fl: inland(Math.round(rx + px * 1.6), Math.round(ry + py * 1.6), a) };
    });
    const clear = [];   // zone da lasciare libere: campi, ingressi, cima
    for (const c of camps) {
      pp('raft', c.rx, c.ry, { t: c.t }); pp('tent', c.tent[0], c.tent[1], TEAMS[c.t].c); pp('campfire', c.cx, c.cy); pp('tflag', c.fl[0], c.fl[1], { c: TEAMS[c.t].c });
      const px = -Math.sin(c.a), py = Math.cos(c.a); pp('crate', Math.round(c.cx - px * 3), Math.round(c.cy - py * 3)); pp('crate2', Math.round(c.cx - px * 3 + Math.cos(c.a)), Math.round(c.cy - py * 3 + Math.sin(c.a)));
      clear.push([c.cx, c.cy, 4.5], [c.rx, c.ry, 2.5]);
    }
    // ---- cima: statua, forziere, mercante, bracieri ----
    const top = { statue: [C, C - 1], chest: [C + 1, C], trader: [C - 3, C + 1] };
    pp('statue', ...top.statue); pp('chestT', ...top.chest); pp('trader', ...top.trader); pp('brazier', C + 2, C - 2); pp('brazier', C - 2, C + 2);
    clear.push([C, C, 4.5]);
    for (const m of mouths) { pp('mine', m.x, m.y, { a: m.a }); clear.push([m.tx, m.ty, 2.4], [m.x, m.y, 1.6]); }
    const isClear = (x, y) => clear.some(([a, b, r]) => Math.hypot(x - a, y - b) < r);
    // ---- punti di riferimento (per gli indizi) ----
    const lms = [];
    const LM = [['wreck', 'il relitto', 'al relitto', 2], ['whale', 'lo scheletro di balena', 'allo scheletro di balena', 2], ['totem', 'il totem', 'al totem', 3], ['pond', 'la pozza', 'alla pozza', 3], ['tower', 'la torre crollata', 'alla torre crollata', 4], ['stones', 'il cerchio di pietre', 'al cerchio di pietre', 3], ['hut', 'la capanna', 'alla capanna', 3]];
    for (const [k, n, a, tt] of LM) {
      for (let i = 0; i < 600; i++) {
        const x = 3 + Math.floor(rnd() * (N - 6)), y = 3 + Math.floor(rnd() * (N - 6));
        if (ter[y][x] !== tt || isClear(x, y) || camps.some(c => Math.hypot(c.cx - x, c.cy - y) < 14) || lms.some(l => Math.hypot(l.x - x, l.y - y) < 15)) continue;
        const cells = k === 'pond' ? [[0, 0], [1, 0], [0, 1], [1, 1]] : k === 'wreck' ? [[0, 0], [1, 0]] : k === 'stones' ? [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -2], [0, 2], [-2, 0], [2, 0], [0, 0]] : [[0, 0]];
        if (!cells.every(([dx, dy]) => free(x + dx, y + dy) && ter[y + dy][x + dx] === tt && hz[y + dy][x + dx] === hz[y][x])) continue;
        if (k === 'pond') cells.forEach(([dx, dy]) => pp('water', x + dx, y + dy)); else if (k === 'wreck') { pp('wreck', x, y); pp('wreck2', x + 1, y); }
        else if (k === 'stones') cells.forEach(([dx, dy]) => { if (dx || dy) pp('rock', x + dx, y + dy); }); else pp(k, x, y);
        lms.push({ k, n, a, x: x + 0.5 + (k === 'pond' || k === 'wreck' ? 0.5 : 0), y: y + 0.5 + (k === 'pond' ? 0.5 : 0) }); clear.push([x, y, 1.6]); break;
      }
    }
    // ---- bosco: palme e alberi fitti, cespugli attraversabili (nascondigli), grandi rocce (nascondigli), sassi, felci ----
    const nearT = (x, y, r) => trees.some(t => Math.abs(t.x - x) < r && Math.abs(t.y - y) < r && Math.hypot(t.x - x, t.y - y) < r);
    const tree = (x, y, k) => { const o = { x, y, k, v: Math.floor(rnd() * 3), h: 1.2 + rnd() * 0.25 }; trees.push(o); pp('tree', x, y, o); };
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      if (!free(x, y) || isClear(x, y)) continue;
      const t = ter[y][x], r = rnd();
      if (t === 2) { if (r < 0.015 && !nearT(x, y, 4)) tree(x, y, 'palm'); else if (r < 0.06) decals.push([x + rnd() * 0.7, y + rnd() * 0.7, 0.14, 0.1, rnd() < 0.5 ? '#f4e8e0' : '#e8b8a8']); continue; }
      if (t === 3) {
        if (r < 0.045 && !nearT(x, y, 3)) { tree(x, y, rnd() < 0.75 ? 'palm' : 'oak'); continue; }
        if (r < 0.052) { pp('bigrock', x, y); continue; }
        if (r < 0.07) { deco.push([x, y, 'pebble']); continue; }
        if (r < 0.2) { deco.push([x, y, 'bush']); continue; }
        if (r < 0.55) deco.push([x, y, r < 0.38 ? 'fern' : r < 0.47 ? 'tuft' : r < 0.52 ? 'shrub' : 'mush']);
        continue;
      }
      if (t === 4) { if (r < 0.025 && !nearT(x, y, 3.5)) tree(x, y, rnd() < 0.5 ? 'palm' : 'oak'); else if (r < 0.037) pp('bigrock', x, y); else if (r < 0.065) deco.push([x, y, 'pebble']); else if (r < 0.11) deco.push([x, y, 'bush']); else if (r < 0.4) deco.push([x, y, 'tuft']); }
    }
    // dove si arriva (un gradino alla volta) partendo dal campo dei Granchi
    const nf = (x, y) => { for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [2, 0], [0, 2]]) if (free(x + dx, y + dy)) return [x + dx, y + dy]; return [x, y]; };
    const seen = MG.flood(W, H, free, ...nf(camps[0].cx, camps[0].cy), step);
    const ok = (x, y) => !!seen[y * W + x];
    const okAll = ok(...nf(camps[1].cx, camps[1].cy)) && mouths.every(m => ok(m.tx, m.ty) && ok(Math.floor(m.ox), Math.floor(m.oy))) && ok(...nf(top.chest[0], top.chest[1])) && ok(...nf(top.trader[0], top.trader[1]));
    const deco2 = deco.filter(([x, y]) => !taken.has(K(x, y)));
    // ---- pezzi della zattera (posti decisi dal seme: uguali per tutti) ----
    const spot = (x0, y0, r) => { for (let i = 0; i < 80; i++) { const x = Math.floor(x0 + (rnd() - 0.5) * 2 * r), y = Math.floor(y0 + (rnd() - 0.5) * 2 * r); if (free(x, y) && ok(x, y) && Math.hypot(x + 0.5 - x0, y + 0.5 - y0) > 0.9) return [x + 0.5, y + 0.5]; } return null; };
    const rspot = (tt, sep, have) => { for (let i = 0; i < 400; i++) { const x = 2 + Math.floor(rnd() * (N - 4)), y = 2 + Math.floor(rnd() * (N - 4)); if (!tt.includes(ter[y][x]) || !free(x, y) || !ok(x, y) || camps.some(c => Math.hypot(c.cx - x, c.cy - y) < 6) || have.some(p => Math.hypot(p[0] - x, p[1] - y) < sep)) continue; return [x + 0.5, y + 0.5]; } return null; };
    const lmSh = lms.slice().sort(() => rnd() - 0.5), items = [], used = [];
    const sl = lmSh.find(l => ['wreck', 'hut', 'tower', 'whale'].includes(l.k)) || lmSh[0];
    const sp = sl && spot(sl.x, sl.y, 2.5) || rspot([3, 4], 0, []) || [C + 0.5, C + 3.5]; items.push(['sail', ...sp]); used.push(sp);
    for (const l of lmSh.filter(l => l !== sl).slice(0, 3)) { const p = spot(l.x, l.y, 2.5); if (p) { items.push(['rope', ...p]); used.push(p); } }
    while (items.filter(i => i[0] === 'rope').length < 5) { const p = rspot([3, 4], 14, used); if (!p) break; items.push(['rope', ...p]); used.push(p); }
    for (let i = 0; i < LOGS; i++) items.push(['log', -10, -10]);   // i tronchi si tagliano dagli alberi: questi restano nascosti (st 3) finche' qualcuno non taglia
    // ---- ROVINE (coordinate "da 0" spostate di RX, RY), meta' 0 a sinistra, meta' 1 a destra (speculare) ----
    const rooms = [{ n: 'Isola', x: 0, y: 0, w: N, h: N, c: ['#4f8a3c', '#4a8338'], wc: 'none', k: 'isle', nl: 1, nm: 1 }];
    const RZ = { half: [], gates: [], comp: null };
    const mr = (h, x, w) => h ? 39 - (x + w - 1) : x, mp = (h, x) => h ? 39 - x : x;
    const RC = ['#6e6656', '#665e4f'];
    const room = (n, x, y, w, h, o) => { rooms.push(Object.assign({ n, x: RX + x, y: RY + y, w, h, c: RC, wc: RUIN, k: 'ruin', nl: 1 }, o || {})); return rooms.length - 1; };
    const PR = (t, x, y, o) => pp(t, RX + x, RY + y, o);
    for (const h of [0, 1]) {
      const H2 = { h };
      H2.atrio = room('Atrio', mr(h, 4, 11), 20, 11, 7); H2.sala = room('Sala delle pedane', mr(h, 5, 10), 12, 10, 7); H2.anti = room('Anticamera', mr(h, 8, 7), 3, 7, 8);
      const gate = (n, cells) => { const g = RZ.gates.length; room('Porta', Math.min(...cells.map(c => c[0])), Math.min(...cells.map(c => c[1])), cells.length > 1 && cells[0][0] !== cells[1][0] ? 2 : 1, cells.length > 1 && cells[0][1] !== cells[1][1] ? 2 : 1, { nm: 1 }); RZ.gates.push({ g, h, n, cells: cells.map(([x, y]) => [RX + x, RY + y]) }); cells.forEach(([x, y]) => PR('gate', x, y, { g, n })); return g; };
      H2.g = [gate(0, [[mp(h, 9), 19], [mp(h, 10), 19]].sort((a, b) => a[0] - b[0])), gate(1, [[mp(h, 11), 11], [mp(h, 12), 11]].sort((a, b) => a[0] - b[0])), gate(2, [[mp(h, 15), 6], [mp(h, 15), 7]])];
      const pt = (x, y) => ({ x: RX + mp(h, x) + 0.5, y: RY + y + 0.5 });
      H2.p1 = pt(13, 25); H2.p2 = [pt(6, 17), pt(14, 13)]; H2.lev = pt(5, 12); H2.gear = pt(14, 6.5); H2.gear.y = RY + 7;
      H2.arr = pt(7, 23); H2.exit = { x: RX + mp(h, 5), y: RY + 22 };
      PR('stairs', mp(h, 4), 22, { h }); PR('lever', mp(h, 5), 12, { h });
      for (const [x, y] of [[4, 20], [14, 20], [14, 26], [4, 26], [14, 18], [5, 18], [8, 3], [14, 3], [8, 10], [14, 10]]) PR('pillar', mp(h, x), y);
      for (const p of [H2.p1, ...H2.p2]) decals.push([Math.floor(p.x) + 0.08, Math.floor(p.y) + 0.08, 0.84, 0.84, '#4a4236'], [Math.floor(p.x) + 0.18, Math.floor(p.y) + 0.18, 0.64, 0.64, '#9a8a62']);
      decals.push([H2.exit.x + 0.1, H2.exit.y + 0.1, 0.8, 0.8, '#8a8070']);
      PR('brazier', mp(h, 9), 5); PR('idol', mp(h, 13), 9);
      RZ.half.push(H2);
    }
    RZ.compR = room('Stanza della bussola', 16, 3, 8, 8, { c: ['#7a6e58', '#72674f'] });
    RZ.comp = { x: RX + 20, y: RY + 7 };
    for (const [x, y] of [[16, 3], [23, 3], [16, 10], [23, 10]]) PR('brazier', x, y);
    PR('idol', 18, 3); PR('idol', 21, 3);
    decals.push([RX + 17.5, RY + 4.5, 5, 5, '#5a4e3a'], [RX + 17.8, RY + 4.8, 4.4, 4.4, '#b89a50'], [RX + 18.2, RY + 5.2, 3.6, 3.6, '#6a5a40'], [RX + 18.9, RY + 5.9, 2.2, 2.2, '#c8a858']);
    items.push(['comp', RZ.comp.x, RZ.comp.y]);
    // squali: girano nel mare intorno all'isola
    const sharks = []; for (let i = 0; i < 5; i++) sharks.push({ d: 3 + rnd() * 6, w: (0.05 + rnd() * 0.05) * (rnd() < 0.5 ? -1 : 1), p: rnd() * 7 });
    const ring = []; for (let i = 0; i < 10; i++) ring.push([camps[0].cx + (i % 3) - 1, camps[0].cy + Math.floor(i / 3) - 1]);
    const holes = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ter[y][x] === 255) { let w = 1; while (x + w < N && ter[y][x + w] === 255) w++; holes.push([x, y, w, 1]); x += w - 1; }
    return { ok: okAll, w: W, h: H, rooms, doors: [], decals, props, holes, trees, bg: x => x >= RX - 8 ? '#050608' : '#2e79b3', deco: deco2, tasks: [], hall: 0, cams: [], vending: [], ring: ring.filter(([x, y]) => free(x, y)).concat([[camps[0].cx, camps[0].cy + 1]]),
      button: { x: -10, y: -10 }, sabs: {}, inn: { Isola: "sull'isola" }, help: '', btnTxt: '', sabTxt: '', draw, floor: FLOOR, drawWall, canKinds: ['palm', 'oak'], xray: 1, canopy, trunk, hz, hb: 1, hzSide, decoDraw,
      ter, camps, mouths, RZ, lms, items, sharks, top, R, seed };
  }

  // ---- disegno della mappa (K = attrezzi di cqTools) ----
  const TERC = { 2: ['#e6d29a', '#dfca91'], 3: ['#4f8a3c', '#4a8338'], 4: ['#76984e', '#709149'], 5: ['#b4ab8c', '#aca385'], 6: ['#76984e', '#709149'], 7: ['#a89c80', '#a09478'] };
  const FLOOR = {
    isle(K, x, y) {
      const t = CQ_MAP.ter[y][x], P = (u, v) => K.S(x + u, y + v, 0);
      if (t <= 1) {   // mare: nel pavimento (non si ridisegna intorno ai personaggi). Colori piu' chiari: sopra ci va l'ombra delle caselle con un oggetto (-22%)
        K.poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], t ? ((x + y) % 2 ? '#6ee7ff' : '#69e0ff') : ((x + y) % 2 ? '#3c9fe9' : '#3a99e2'));
        if (K.hsh(x, y, 70) < 0.35) { const u = 0.1 + 0.6 * K.hsh(x, y, 71), v = 0.15 + 0.7 * K.hsh(x, y, 72); K.poly([P(u, v), P(u + 0.3, v), P(u + 0.3, v + 0.05), P(u, v + 0.05)], t ? '#b1ffff' : '#73c8ff'); }
        return;
      }
      const col = TERC[t]; if (!col) return;
      K.poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], col[(x + y) % 2]);
      if (K.TW < 40) return;
      if (t === 2) { K.speck(x, y, 7, ['rgba(255,250,220,.5)', 'rgba(150,110,50,.22)'], K.TW / 24); }
      else if (t === 3 || t === 4 || t === 6) {
        K.speck(x, y, 5, ['rgba(160,210,100,.3)', 'rgba(20,50,15,.25)'], K.TW / 22);
        const L = []; for (let i = 0; i < 3; i++) { const u = 0.15 + 0.7 * K.hsh(x, y, 20 + i), v = 0.15 + 0.7 * K.hsh(x, y, 30 + i); L.push([K.S(x + u, y + v, 0), K.S(x + u + 0.04, y + v, 0.14 + 0.1 * K.hsh(x, y, 40 + i))]); }
        K.strokes(L, t === 3 ? 'rgba(120,180,80,.6)' : 'rgba(170,190,110,.6)');
        if (t === 4 && K.hsh(x, y, 9) < 0.2) { const [X, Y] = P(0.3 + 0.4 * K.hsh(x, y, 10), 0.3 + 0.4 * K.hsh(x, y, 11)); K.g.fillStyle = '#a8a294'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW / 20, K.TW / 40, 0, 0, 7); K.g.fill(); }
      } else if (t === 5) { K.strokes([[P(0.05, 0.05), P(0.95, 0.05)], [P(0.05, 0.05), P(0.05, 0.95)]], 'rgba(255,255,255,.14)'); K.strokes([[P(0.95, 0.05), P(0.95, 0.95)], [P(0.05, 0.95), P(0.95, 0.95)]], 'rgba(0,0,0,.16)'); }
      else if (t === 7) { const L = []; for (let i = 1; i < 4; i++) L.push([P(0.05, i / 4), P(0.95, i / 4)]); K.strokes(L, 'rgba(60,50,40,.35)'); }
    },
    ruin(K, x, y) {
      const P = (u, v) => K.S(x + u, y + v, 0);
      K.strokes([[P(0.04, 0.04), P(0.96, 0.04)], [P(0.04, 0.04), P(0.04, 0.96)]], 'rgba(255,240,200,.1)'); K.strokes([[P(0.96, 0.04), P(0.96, 0.96)], [P(0.04, 0.96), P(0.96, 0.96)]], 'rgba(0,0,0,.25)');
      if (K.hsh(x, y, 3) < 0.18) { const a = P(0.2, 0.3 + 0.4 * K.hsh(x, y, 4)), b = P(0.5, 0.5), c = P(0.8, 0.2 + 0.5 * K.hsh(x, y, 5)); K.strokes([[a, b], [b, c]], 'rgba(0,0,0,.35)'); }
      if (K.hsh(x, y, 6) < 0.12) K.speck(x, y, 5, ['rgba(90,140,60,.6)', 'rgba(60,110,40,.6)'], K.TW / 14);
    }
  };
  // fianchi della collina: strati di roccia, l'ultimo strato del colore del prato
  function hzSide(x, y, i, z) { const t = CQ_MAP.ter[y][x]; if (i === z - 1) return t === 5 ? '#9a917a' : t === 4 ? '#6a8f44' : '#4f7f38'; return i % 2 ? '#857a64' : '#7a6f5a'; }
  // cespuglio grande: ci si passa attraverso (si disegna col pavimento; chi ci sta dentro ha le foglie davanti, vedi deco)
  function decoDraw(K, t, x, y) {
    if (t === 'pebble') {
      const n = 1 + Math.floor(K.hsh(x, y, 90) * 3), C2 = [['#8e8a82', '#a29e95'], ['#857f74', '#9a9488'], ['#938e84', '#aaa59a']][Math.floor(K.hsh(x, y, 91) * 3)];
      for (let i = 0; i < n; i++) {
        const u = 0.18 + 0.6 * K.hsh(x, y, 92 + i), v = 0.18 + 0.6 * K.hsh(x, y, 95 + i), w = 0.1 + 0.14 * K.hsh(x, y, 98 + i), d = 0.08 + 0.12 * K.hsh(x, y, 101 + i), h = 0.08 + 0.22 * K.hsh(x, y, 104 + i);
        K.bx(x + u - w, y + v - d, x + u + w, y + v + d, 0, h, C2[0]); if (h > 0.18) K.bx(x + u - w * 0.6, y + v - d * 0.6, x + u + w * 0.4, y + v + d * 0.5, h, h + 0.07, C2[1]);
      }
      return;
    }
    if (t !== 'bush') return;
    K.bx(x + 0.08, y + 0.1, x + 0.92, y + 0.92, 0, 0.55, '#3f7a36'); K.bx(x + 0.2, y + 0.22, x + 0.8, y + 0.8, 0.55, 0.82, '#4a8a40'); K.bx(x + 0.32, y + 0.34, x + 0.62, y + 0.64, 0.82, 0.95, '#56984a');
    if (K.hsh(x, y, 65) < 0.4) { K.dot(x + 0.3, y + 0.92, 0.35, 0.03, '#c8304a'); K.dot(x + 0.62, y + 0.92, 0.25, 0.03, '#c8304a'); K.dot(x + 0.92, y + 0.5, 0.4, 0.03, '#c8304a'); }
  }
  function drawWall(K, x, y, col) {
    if (col === 'none') return;
    const h = 1.25 + 0.15 * K.hsh(x, y, 70);
    K.bx(x, y, x + 1, y + 1, 0, h, col); K.bx(x - 0.02, y - 0.02, x + 1.02, y + 1.02, h, h + 0.12, K.shade(col, 1.15));
    if (K.TW < 40) return;
    for (const [F, k] of [[(u, z) => K.S(x + u, y + 1, z), 0.74], [(u, z) => K.S(x + 1, y + u, z), 0.52]]) {
      K.strokes([[F(0, 0.42), F(1, 0.42)], [F(0, 0.84), F(1, 0.84)], [F(0.5, 0), F(0.5, 0.42)], [F(0.25, 0.42), F(0.25, 0.84)], [F(0.75, 0.42), F(0.75, 0.84)]], K.shade(col, k * 0.6));
      if (K.hsh(x, y, 71) < 0.3) { const [X, Y] = F(0.3 + 0.4 * K.hsh(x, y, 72), 0.6); K.g.fillStyle = '#4f7a3a'; K.g.fillRect(X - 2, Y, 4, K.TW / 6); }
    }
  }
  // palma: tronco curvo ad anelli, ciuffo di foglie e noci di cocco (tutto nell'immagine della chioma)
  function canopy(K, k, v, h) {
    if (k !== 'palm') return false;
    const { cyl, S, g, dot } = K, lean = [0.5, -0.45, 0.25][v], top = 3.6 * h;
    for (let i = 0; i < 9; i++) { const f = i / 9, f2 = (i + 1) / 9; cyl(0.5 + lean * f * f, 0.5 - lean * f * f * 0.4, 0.13 - 0.03 * f, top * f, top * f2 + 0.05, i % 2 ? '#8a6a44' : '#7a5c3a'); }
    const tx = 0.5 + lean, ty = 0.5 - lean * 0.4, C2 = [['#3f8a3a', '#56a048'], ['#4a9440', '#62aa50'], ['#378036', '#4c983e']][v];
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + v * 0.3, L = 1.35 + 0.15 * (i % 3), ex = Math.cos(a) * L, ey = Math.sin(a) * L, nx = -Math.sin(a) * 0.22, ny = Math.cos(a) * 0.22;
      const b = S(tx, ty, top), m1 = S(tx + ex * 0.5 + nx, ty + ey * 0.5 + ny, top + 0.25), m2 = S(tx + ex * 0.5 - nx, ty + ey * 0.5 - ny, top + 0.25), e = S(tx + ex, ty + ey, top - 0.9);
      g.fillStyle = C2[i % 2]; g.beginPath(); g.moveTo(...b); g.quadraticCurveTo(m1[0], m1[1], e[0], e[1]); g.quadraticCurveTo(m2[0], m2[1], b[0], b[1]); g.fill();
    }
    for (const [u, w] of [[0.1, 0], [-0.1, 0.08], [0, -0.1]]) dot(tx + u, ty + w, top - 0.15, 0.07, '#6a4a22');
    return true;
  }
  const trunk = (K, x, y, o) => o.k === 'palm';
  function draw(K, t, x, y, o) {
    const { bx, cyl, qL, dot, glow, line, S, poly, hsh } = K;
    switch (t) {
      case 'sea': break;   // il mare si disegna col pavimento (FLOOR.isle); l'oggetto serve solo a non farci camminare
      case 'seaOld': {
        const sh = CQ_MAP.ter[y][x] === 1, P = (u, v, z) => S(x + u, y + v, z || 0.02);
        poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], sh ? ((x + y) % 2 ? '#56b4d0' : '#52afcb') : ((x + y) % 2 ? '#2f7cb6' : '#2d77b0'));
        if (hsh(x, y, 70) < 0.35) { const u = 0.1 + 0.6 * hsh(x, y, 71), v = 0.15 + 0.7 * hsh(x, y, 72); poly([P(u, v), P(u + 0.3, v), P(u + 0.3, v + 0.05), P(u, v + 0.05)], sh ? '#8ad4e8' : '#5a9cd0'); }
        break; }
      case 'cliff': { const hh = 0.9 + 0.3 * hsh(x, y, 73); bx(x, y, x + 1, y + 1, 0, hh, '#8a8170'); bx(x - 0.02, y - 0.02, x + 1.02, y + 1.02, hh, hh + 0.1, '#6f9446'); if (hsh(x, y, 74) < 0.35) bx(x + 0.2, y + 0.2, x + 0.6, y + 0.6, hh + 0.1, hh + 0.35, '#968d7c'); break; }
      case 'bigrock': {
        const f = Math.floor(hsh(x, y, 76) * 4), C3 = [['#8e8a82', '#9c988f', '#a8a49a'], ['#857f74', '#948e82', '#a39d90'], ['#918b7f', '#a09a8e', '#aea89c']][Math.floor(hsh(x, y, 77) * 3)];
        if (f === 0) { bx(x + 0.04, y + 0.08, x + 0.96, y + 0.96, 0, 1.05, C3[0]); bx(x + 0.15, y + 0.18, x + 0.85, y + 0.82, 1.05, 1.6, C3[1]); bx(x + 0.3, y + 0.3, x + 0.62, y + 0.6, 1.6, 1.8, C3[2]); }   // masso alto
        else if (f === 1) { bx(x - 0.05, y + 0.05, x + 1.05, y + 0.95, 0, 0.6, C3[0]); bx(x + 0.1, y + 0.12, x + 0.95, y + 0.8, 0.6, 0.95, C3[1]); bx(x + 0.5, y + 0.2, x + 0.85, y + 0.6, 0.95, 1.1, C3[2]); }   // lastra larga
        else if (f === 2) { bx(x + 0.02, y + 0.3, x + 0.55, y + 0.98, 0, 1.25, C3[0]); bx(x + 0.45, y + 0.02, x + 0.98, y + 0.6, 0, 0.85, C3[1]); bx(x + 0.1, y + 0.4, x + 0.45, y + 0.85, 1.25, 1.45, C3[2]); }   // due massi
        else { bx(x + 0.08, y + 0.1, x + 0.92, y + 0.92, 0, 0.7, C3[0]); bx(x + 0.22, y + 0.25, x + 0.75, y + 0.75, 0.7, 1.5, C3[1]); bx(x + 0.35, y + 0.38, x + 0.6, y + 0.6, 1.5, 2.2, C3[2]); }   // guglia
        if (hsh(x, y, 75) < 0.5) bx(x + 0.1, y + 0.1, x + 0.45, y + 0.45, f === 1 ? 0.95 : 1.05, (f === 1 ? 0.95 : 1.05) + 0.05, '#5a8a44');
        break; }
      case 'raft': {
        const G = cq.g, ok = G && G.mode === 'naufraghi' && G.it, n = k => ok ? OB.count(G, o.t, k) : 0, nl = Math.min(4, n('log')), nr = Math.min(2, n('rope'));
        if (ok && G.go && G.go.t === o.t) break;   // salpata: si disegna in mare (over)
        for (const [u, v] of [[0.0, 0.05], [0.95, 0.05], [0.0, 0.95], [0.95, 0.95]]) bx(x + u, y + v, x + u + 0.06, y + v + 0.06, 0, 0.3, '#a88050');
        for (let i = 0; i < nl; i++) { const u = 0.02 + i * 0.245; bx(x + u, y - 0.25, x + u + 0.22, y + 1.25, 0, 0.22, i % 2 ? '#8a5e3a' : '#7a5232'); dot(x + u + 0.11, y + 1.25, 0.11, 0.07, '#d8b07a'); }
        for (let r = 0; r < nr; r++) { const v = 0.05 + r * 0.8; bx(x - 0.02, y + v, x + 0.02 + 0.245 * Math.max(1, nl), y + v + 0.1, 0.18, 0.25, '#d8c08a'); }
        if (n('sail')) { bx(x + 0.46, y + 0.46, x + 0.54, y + 0.54, 0.2, 2.8, '#6b4a2e'); poly([S(x + 0.5, y + 0.5, 2.7), S(x + 0.5, y + 1.25, 0.6), S(x + 0.5, y - 0.2, 0.6)], '#efe6cf'); poly([S(x + 0.5, y + 0.5, 2.7), S(x + 0.5, y + 0.85, 1.6), S(x + 0.5, y + 0.15, 1.6)], TEAMS[o.t].c); }
        if (n('comp')) { cyl(x + 0.25, y + 0.75, 0.12, 0.22, 0.32, '#b8862a'); dot(x + 0.25, y + 0.75, 0.33, 0.06, '#f4ecd2'); glow(x + 0.25, y + 0.75, 0.4, 0.5, 'rgba(255,220,120,.5)'); }
        break; }
      case 'tflag': bx(x + 0.46, y + 0.46, x + 0.54, y + 0.54, 0, 2.4, '#d8c9a0'); poly([S(x + 0.5, y + 0.5, 2.35), S(x + 0.5, y + 1.3, 2.1), S(x + 0.5, y + 0.5, 1.75)], o.c); break;
      case 'cave': {
        bx(x - 0.1, y - 0.1, x + 1.1, y + 1.1, 0, 1.5, '#7f776a'); bx(x, y, x + 0.9, y + 0.9, 1.5, 1.9, '#8a8274'); bx(x - 0.1, y - 0.1, x + 1.1, y + 1.1, 1.45, 1.55, '#6f9446');
        const ca = Math.cos(o.a), sa = Math.sin(o.a);   // l'apertura guarda fuori dalla cima
        if (ca + sa > 0 || true) { if (sa > -0.3) qL(x + 0.22, x + 0.78, y + 1.1, 0, 1.0, '#16120e'); if (ca > -0.3) poly([S(x + 1.1, y + 0.22, 1.0), S(x + 1.1, y + 0.78, 1.0), S(x + 1.1, y + 0.78, 0), S(x + 1.1, y + 0.22, 0)], '#16120e'); }
        break; }
      case 'mine': {   // imbocco della miniera nella parete di roccia: travi di legno, buio dentro, una lanterna
        bx(x - 0.05, y - 0.05, x + 1.05, y + 1.05, 0, 1.55, '#857a64'); bx(x - 0.05, y - 0.05, x + 1.05, y + 1.05, 1.55, 1.7, '#6a8f44');
        for (const F of [(u, z) => S(x + u, y + 1.05, z), (u, z) => S(x + 1.05, y + u, z)]) {
          poly([F(0.2, 0), F(0.8, 0), F(0.8, 1.0), F(0.2, 1.0)], '#120e0a');
          poly([F(0.12, 0), F(0.22, 0), F(0.22, 1.1), F(0.12, 1.1)], '#6b4a2e'); poly([F(0.78, 0), F(0.88, 0), F(0.88, 1.1), F(0.78, 1.1)], '#6b4a2e'); poly([F(0.08, 1.0), F(0.92, 1.0), F(0.92, 1.18), F(0.08, 1.18)], '#7a5232');
        }
        dot(x + 1.08, y + 1.08, 1.0, 0.05, '#ffd25a'); glow(x + 1.08, y + 1.08, 1.0, 0.8, 'rgba(255,210,90,.5)'); break; }
      case 'statue': {   // statua di pietra (testa gigante) con gli occhi d'oro
        bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0, 0.4, '#7a7468'); bx(x + 0.18, y + 0.2, x + 0.82, y + 0.8, 0.4, 2.9, '#8f897a'); bx(x + 0.12, y + 0.15, x + 0.88, y + 0.85, 2.9, 3.2, '#6f6a5e');
        bx(x + 0.3, y + 0.8, x + 0.7, y + 0.88, 1.6, 2.4, '#a29c8c'); qL(x + 0.28, x + 0.42, y + 0.81, 2.3, 2.45, '#e8c040'); qL(x + 0.58, x + 0.72, y + 0.81, 2.3, 2.45, '#e8c040'); qL(x + 0.35, x + 0.65, y + 0.81, 1.25, 1.35, '#5a564c'); break; }
      case 'chestT': {
        const G = cq.g, open = G && G.mode === 'naufraghi' && G.chest > G.time;
        bx(x + 0.12, y + 0.22, x + 0.88, y + 0.78, 0, 0.5, '#8a5a32'); qL(x + 0.12, x + 0.88, y + 0.78, 0.42, 0.5, '#d8a830');
        if (open) { poly([S(x + 0.12, y + 0.22, 0.5), S(x + 0.88, y + 0.22, 0.5), S(x + 0.88, y + 0.02, 0.95), S(x + 0.12, y + 0.02, 0.95)], '#9a6a3a'); poly([S(x + 0.15, y + 0.25, 0.48), S(x + 0.85, y + 0.25, 0.48), S(x + 0.85, y + 0.75, 0.48), S(x + 0.15, y + 0.75, 0.48)], '#2a1a10'); }
        else { bx(x + 0.1, y + 0.2, x + 0.9, y + 0.8, 0.5, 0.72, '#9a6a3a'); qL(x + 0.45, x + 0.55, y + 0.8, 0.3, 0.6, '#f2c84a'); glow(x + 0.5, y + 0.5, 0.8, 0.9, 'rgba(255,215,90,.55)'); }
        break; }
      case 'wreck': bx(x - 0.1, y + 0.15, x + 1, y + 0.85, 0, 0.75, '#5a3e26'); bx(x, y + 0.25, x + 1, y + 0.75, 0.75, 0.82, '#3a2818'); for (let i = 0; i < 3; i++) bx(x + 0.1 + i * 0.32, y + 0.12, x + 0.18 + i * 0.32, y + 0.88, 0.7, 1.15, '#6b4a2e'); bx(x + 0.45, y + 0.45, x + 0.55, y + 0.55, 0.8, 2.2, '#5a3e26'); line(S(x + 0.5, y + 0.5, 2.1), S(x + 1.2, y + 0.5, 1.3), '#4a3020', 3); break;
      case 'wreck2': bx(x, y + 0.2, x + 0.9, y + 0.8, 0, 0.6, '#5a3e26'); poly([S(x + 0.9, y + 0.2, 0.6), S(x + 1.25, y + 0.5, 0.9), S(x + 0.9, y + 0.8, 0.6)], '#6b4a2e'); bx(x + 0.3, y + 0.15, x + 0.38, y + 0.85, 0.55, 0.95, '#6b4a2e'); break;
      case 'whale': for (let i = 0; i < 5; i++) { const u = 0.1 + i * 0.2, hh = 0.9 + Math.sin(i / 4 * Math.PI) * 0.5; line(S(x + u, y + 0.1, 0), S(x + u, y + 0.5, hh), '#efe8d8', 4); line(S(x + u, y + 0.9, 0), S(x + u, y + 0.5, hh), '#e2dac8', 4); } bx(x - 0.1, y + 0.45, x + 1.1, y + 0.55, 0.05, 0.15, '#efe8d8'); bx(x + 1.0, y + 0.3, x + 1.35, y + 0.7, 0, 0.35, '#e8e0cc'); break;
      case 'totem': ['#c0392b', '#2f8a5a', '#e2b830', '#3b6fe0'].forEach((c, i) => { bx(x + 0.25, y + 0.25, x + 0.75, y + 0.75, i * 0.6, i * 0.6 + 0.58, c); qL(x + 0.32, x + 0.42, y + 0.751, i * 0.6 + 0.3, i * 0.6 + 0.42, '#111'); qL(x + 0.58, x + 0.68, y + 0.751, i * 0.6 + 0.3, i * 0.6 + 0.42, '#111'); }); poly([S(x + 0.05, y + 0.5, 2.3), S(x + 0.95, y + 0.5, 2.3), S(x + 0.5, y + 0.5, 2.0)], '#e2b830'); break;
      case 'tower': bx(x + 0.08, y + 0.08, x + 0.92, y + 0.92, 0, 2.2, '#9a9284'); bx(x + 0.08, y + 0.08, x + 0.5, y + 0.92, 2.2, 2.8, '#9a9284'); bx(x + 0.08, y + 0.08, x + 0.3, y + 0.5, 2.8, 3.1, '#9a9284'); qL(x + 0.4, x + 0.6, y + 0.921, 1.2, 1.7, '#2a2620'); qL(x + 0.1, x + 0.9, y + 0.921, 0.6, 0.66, '#7a7264'); bx(x + 0.6, y + 0.95, x + 0.9, y + 1.2, 0, 0.2, '#8a8274'); break;
      case 'hut': for (const [u, v] of [[0.1, 0.1], [0.85, 0.1], [0.1, 0.85], [0.85, 0.85]]) bx(x + u, y + v, x + u + 0.06, y + v + 0.06, 0, 1.0, '#6b4a2e'); bx(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0, 0.7, '#a88a5a'); poly([S(x - 0.05, y - 0.05, 1.0), S(x + 1.05, y - 0.05, 1.0), S(x + 0.5, y + 0.5, 1.8)], '#c8a85a'); poly([S(x + 1.05, y - 0.05, 1.0), S(x + 1.05, y + 1.05, 1.0), S(x + 0.5, y + 0.5, 1.8)], '#a88a40'); poly([S(x - 0.05, y + 1.05, 1.0), S(x + 1.05, y + 1.05, 1.0), S(x + 0.5, y + 0.5, 1.8)], '#d8b868'); qL(x + 0.4, x + 0.6, y + 0.851, 0, 0.5, '#2a1e14'); break;
      case 'gate': {   // lastra di pietra incisa; la porta a ingranaggi ha due ruote dentate di bronzo
        const R = cq.g && cq.g.R; if (R && R.o[o.g]) break;
        bx(x, y, x + 1, y + 1, 0, 1.6, '#8c8371'); bx(x - 0.02, y - 0.02, x + 1.02, y + 1.02, 1.6, 1.7, '#9c9381');
        if (o.n === 2) { for (const [u, z, r] of [[0.35, 0.95, 0.28], [0.7, 0.55, 0.2]]) { const [X, Y] = S(x + u, y + 1, z); K.g.fillStyle = '#b8862a'; K.g.beginPath(); K.g.arc(X, Y, r * K.TW * 0.6, 0, 7); K.g.fill(); K.g.fillStyle = '#7a5a1a'; K.g.beginPath(); K.g.arc(X, Y, r * K.TW * 0.25, 0, 7); K.g.fill(); } }
        else K.strokes([[S(x + 0.2, y + 1, 0.4), S(x + 0.8, y + 1, 0.4)], [S(x + 0.5, y + 1, 0.3), S(x + 0.5, y + 1, 1.3)], [S(x + 0.3, y + 1, 1.1), S(x + 0.7, y + 1, 1.1)]], '#5a5244', 2);
        break; }
      case 'lever': { const R = cq.g && cq.g.R, on = R && R.lev[o.h]; bx(x + 0.3, y + 0.3, x + 0.7, y + 0.7, 0, 0.5, '#6f6858'); line(S(x + 0.5, y + 0.5, 0.5), S(x + (on ? 0.85 : 0.15), y + 0.5, 1.2), '#5a3e26', Math.max(3, K.TW / 10)); dot(x + (on ? 0.85 : 0.15), y + 0.5, 1.22, 0.06, on ? '#e8c040' : '#c0392b'); break; }
      case 'stairs': for (let i = 0; i < 4; i++) { if (o.h) bx(x + i * 0.22, y + 0.05, x + 1, y + 0.95, 0, 0.3 + i * 0.3, '#8c8371'); else bx(x, y + 0.05, x + 1 - i * 0.22, y + 0.95, 0, 0.3 + i * 0.3, '#8c8371'); } glow(x + (o.h ? 0.9 : 0.1), y + 0.5, 1.4, 0.7, 'rgba(255,240,200,.45)'); break;   // salgono verso la parete: da li' si torna fuori
      case 'pillar': cyl(x + 0.5, y + 0.5, 0.3, 0, 0.2, '#7a7262'); cyl(x + 0.5, y + 0.5, 0.22, 0.2, 1.8, '#958c7a'); cyl(x + 0.5, y + 0.5, 0.3, 1.8, 2.0, '#7a7262'); break;
      case 'brazier': bx(x + 0.42, y + 0.42, x + 0.58, y + 0.58, 0, 0.7, '#4a4038'); cyl(x + 0.5, y + 0.5, 0.25, 0.7, 0.9, '#6a5a48'); dot(x + 0.5, y + 0.5, 1.0, 0.1, '#ffb030'); dot(x + 0.5, y + 0.5, 1.1, 0.06, '#ffe070'); glow(x + 0.5, y + 0.5, 1.0, 1.2, 'rgba(255,180,60,.5)'); break;
      case 'idol': bx(x + 0.2, y + 0.2, x + 0.8, y + 0.8, 0, 0.6, '#6f6858'); bx(x + 0.35, y + 0.35, x + 0.65, y + 0.65, 0.6, 1.3, '#d8a830'); bx(x + 0.3, y + 0.3, x + 0.7, y + 0.7, 1.3, 1.45, '#e8c040'); break;
      case 'crate2': bx(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0, 0.7, '#9a7a4a'); bx(x + 0.25, y + 0.25, x + 0.75, y + 0.75, 0.7, 1.15, '#a8885a'); break;
    }
  }
  CQ_MAPS.isola = { n: 'Isola misteriosa', make: mapIsola, seeded: true, only: 'naufraghi' };

  // ======================= REGOLE =======================
  // vede a -> b? (stesso livello; nascosto nei cespugli = no; nelle rovine solo nella stessa stanza o vicino; di notte vicino o per la torcia)
  // si vedono a -> b? la collina in mezzo copre (terreno piu' alto della linea degli occhi)
  function los(ax, ay, bx, by) {
    if (!CQ_MAP.hz) return true;
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2), za = cqHz(ax, ay) + 1.3, zb = cqHz(bx, by) + 1.3;
    for (let i = 1; i < n; i++) { const t = i / n; if (cqHc(Math.floor(ax + (bx - ax) * t), Math.floor(ay + (by - ay) * t)) > za + (zb - za) * t + 0.2) return false; }
    return true;
  }
  function canSee(G, a, b) {
    const p = P(a), q = P(b); if (lvl(p.x) !== lvl(q.x)) return false;
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (b.hd && b.t !== a.t) return d < 0.9;
    if (lvl(p.x)) return d < RUIN_SEE || roomAt(p.x, p.y) === roomAt(q.x, q.y);
    if (d > 1.5 && !los(p.x, p.y, q.x, q.y)) return false;
    return dark(G) > 0.5 ? d < SEE_N || d < SEEN_T : d < 14;
  }
  // stanza delle rovine dove sono (sulla soglia di una porta resta quella di prima)
  function ruinRoom(G) {
    const r = roomAt(cq.x, cq.y), R = CQ_ROOMS[r];
    if (R && R.k === 'ruin' && R.n !== 'Porta' && r !== G.rr) { G.rr = r; G.rrT = performance.now(); if (G.time > 0.5) { thud(0.35, 180); beep(220, 0.25, 0.02, 0.05, 'triangle'); } }
    return G.rr;
  }
  const inBush = (x, y) => !!(cqDeco && cqDeco[Math.floor(y)] && cqDeco[Math.floor(y)][Math.floor(x)] === 'bush');
  const cover = (x, y) => { if (inBush(x, y)) return true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const s = cqSolid[Math.floor(y) + dy] && cqSolid[Math.floor(y) + dy][Math.floor(x) + dx]; if (s && (s.prop === 'bush' || s.prop === 'bigrock') && Math.hypot(Math.floor(x) + dx + 0.5 - x, Math.floor(y) + dy + 0.5 - y) < COVER) return true; } return false; };
  const raftOf = (G, t) => { const c = MP().camps[t]; return { x: c.rx + 0.5, y: c.ry + 0.5 }; };
  const nearRaft = (G, c, t) => dxy(c, raftOf(G, t).x, raftOf(G, t).y) < RAFT_R;
  const chestOk = G => G.chest <= G.time;
  const nearChest = c => { const t = MP().top.chest; return dxy(c, t[0] + 0.5, t[1] + 0.5) < 1.6; };
  const nearTrader = c => { const t = MP().top.trader; return dxy(c, t[0] + 0.5, t[1] + 0.5) < 1.9; };
  const gateNear = (G, c) => { for (const H of MP().RZ.half) { const g = H.g[2]; if (!G.R.o[g] && dxy(c, H.gear.x, H.gear.y) < 1.7) return g; } return -1; };
  const leverNear = (G, c) => { for (const H of MP().RZ.half) if (!G.R.lev[H.h] && dxy(c, H.lev.x, H.lev.y) < 1.5) return H.h; return -1; };
  function stabTarget(G, c) { let b = null, bd = REACH; for (const e of active(G)) { if (e.t === c.t || (e.safe || 0) > G.time) continue; const d = dist(c, e); if (d < bd && canSee(G, c, e)) { bd = d; b = e; } } return b; }
  function gunTarget(G, c) { if (!(c.gun > 0)) return null; let b = null, bd = GUN; for (const e of active(G)) { if (e.t === c.t || (e.safe || 0) > G.time) continue; const d = dist(c, e); if (d < bd && canSee(G, c, e)) { bd = d; b = e; } } return b; }

  // l'azione del pulsante grande per il personaggio c (la stessa logica decide anche cosa accetta l'host dagli amici)
  function action(G, c) {
    if (!c.alive || jailed(G, c) || G.go) return null;
    const me = c === G.me, h = held(G, c);
    if (c.op) return { k: 'wait', t: ({ steal: '🫳 Rubo… ', chest: '💰 Apro… ', chop: '🪓 Taglio… ' })[c.op.k] + Math.round(Math.min(1, (G.time - c.op.t0) / OPT[c.op.k]) * 100) + '%', on: false };
    const v = stabTarget(G, c); if (v) return { k: 'stab', v: v.id, t: G.time < (c.kcd || 0) ? '🔪 ' + Math.ceil(c.kcd - G.time) + ' s' : '🔪 Colpisci', on: G.time >= (c.kcd || 0) };
    const gt = gunTarget(G, c); if (gt) return { k: 'shoot', v: gt.id, t: '🔫 Spara (' + c.gun + ')', on: true };
    if (!h && nearRaft(G, c, 1 - c.t) && OB.count(G, 1 - c.t)) return { k: 'steal', t: G.time < (c.stc || 0) ? '🫳 Aspetta ' + Math.ceil(c.stc - G.time) + ' s' : '🫳 Ruba dalla zattera', on: G.time >= (c.stc || 0) };
    if (!h) { const ti = treeNear(G, c); if (ti >= 0) return { k: 'chop', i: ti, t: '🪓 Taglia', on: true }; }
    if (nearChest(c)) return { k: 'chest', t: chestOk(G) ? '💰 Apri il forziere' : '💰 Si riapre tra ' + Math.ceil(G.chest - G.time) + ' s', on: chestOk(G) };
    if (me && nearTrader(c)) return { k: 'shop', t: '🛒 Mercante (' + (c.co || 0) + ' 🪙)', on: true };
    const lv = leverNear(G, c); if (lv >= 0) return { k: 'lev', i: lv, t: '🔧 Tira la leva', on: true };
    const gg = gateNear(G, c); if (gg >= 0) return { k: 'gear', i: gg, t: '⚙️ Ingranaggi', on: true };
    if (c.hd) return { k: 'unhide', t: '🌿 Esci allo scoperto', on: true };
    if (cover(P(c).x, P(c).y) && lvl(P(c).x) === 0) return { k: 'hide', t: '🌿 Nasconditi', on: true };
    if (h) return { k: 'drop', t: '⬇️ Lascia ' + OB.KINDS[h.k].a, on: true };
    return null;
  }
  // l'host esegue l'azione (sua, del computer o di un amico): ricontrolla che si possa
  function doAct(G, c, a) {
    if (!c || !c.alive || jailed(G, c) || G.go || !a) return;
    const real = action(G, c); if (!real && !['hide', 'unhide', 'buy', 'gearok'].includes(a.k)) return;
    const p = P(c);
    if (a.k === 'stab') { const v = byId(G, a.v); if (v && v.alive && !jailed(G, v) && v.t !== c.t && dist(c, v) < REACH + 0.4 && G.time >= (c.kcd || 0)) kill(G, v, c, 'k'); }
    else if (a.k === 'shoot') { const v = byId(G, a.v); if (c.gun > 0 && v && v.alive && !jailed(G, v) && v.t !== c.t && dist(c, v) < GUN + 0.5) { c.gun--; const q = P(v); G.fx.push([p.x, p.y, q.x, q.y, G.time]); kill(G, v, c, 'g'); } }
    else if (a.k === 'steal' && real.k === 'steal' && real.on) { c.op = { k: 'steal', t0: G.time, x: p.x, y: p.y }; say(G, 'stl', { a: c.id, b: 1 - c.t }); }
    else if (a.k === 'chest' && real.k === 'chest' && real.on) { c.op = { k: 'chest', t0: G.time, x: p.x, y: p.y }; }
    else if (a.k === 'chop' && real.k === 'chop') { c.op = { k: 'chop', t0: G.time, x: p.x, y: p.y, i: real.i }; }
    else if (a.k === 'lev' && real.k === 'lev') { G.R.lev[a.i] = 1; G.R.p[MP().RZ.half[a.i].g[0]] = 1; say(G, 'lev', { a: c.id, h: a.i }); }
    else if (a.k === 'gearok') { const g = a.i, gt = MP().RZ.gates[g]; if (gt && gt.n === 2 && !G.R.p[g]) { G.R.p[g] = 1; say(G, 'gear', { a: c.id, h: gt.h }); } }
    else if (a.k === 'hide') { if (cover(p.x, p.y)) { c.hd = 1; c.path = []; } }
    else if (a.k === 'unhide') c.hd = 0;
    else if (a.k === 'drop') { const h = held(G, c); if (h) OB.drop(G, h, p.x, p.y, c); }
    else if (a.k === 'buy') buy(G, c, a.i);
  }
  function buy(G, c, i) {
    const s = SHOP[i]; if (!s || (c.co || 0) < s[2] || !nearTrader(c)) return;
    c.co -= s[2];
    if (s[0] === 'fast') c.fast = Math.max(G.time, c.fast || 0) + FAST_T;
    else if (s[0] === 'gun') c.gun = (c.gun || 0) + 2;
    else if (s[0] === 'map') { G.mapT[c.t] = G.time + MAP_T; for (const it of G.it) if (it.k === 'rope' || it.k === 'sail') G.kn[c.t].add(it.id); }
    say(G, 'buy', { a: c.id, i });
  }
  function kill(G, v, by, w) {
    const h = held(G, v), p = P(v); if (h) OB.drop(G, h, p.x, p.y);
    v.lv = (v.lv || LIVES) - 1; v.hd = 0; v.op = null; v.path = []; v.walk = 0; by.kcd = G.time + (by.bot ? 14 : KCD); by.hd = 0; by.tg = (by.tg || 0) + 1;
    G.bodies = G.bodies.filter(b => b.id !== v.id);
    G.bodies.push({ id: v.id, x: p.x, y: p.y, face: v === G.me ? cq.face : v.face, look: cqLookOf(v), name: v.name, t: G.time });
    if (v.lv > 0) v.jail = G.time + JAIL; else { v.alive = false; v.jail = 0; }
    say(G, 'kill', { a: v.id, b: by.id, g: v.lv > 0 ? 0 : 1, w });
  }
  function revive(G, c) {
    c.jail = 0; c.safe = G.time + SAFE; c.angel = G.time; G.bodies = G.bodies.filter(b => b.id !== c.id);
    if (c === G.me || !c.remote) { const s = SQ.spawn(MP().camps[c.t], 6); c.x = s.x; c.y = s.y; c.path = []; if (c === G.me) { cq.x = s.x; cq.y = s.y; } }
    if (c === G.me || dxy(G.me, c.x, c.y) < 9) { beep(880, 0.35, 0.025, 0, 'triangle'); beep(1109, 0.35, 0.025, 0.12, 'triangle'); beep(1319, 0.5, 0.025, 0.24, 'triangle'); }
  }
  // porte delle rovine: aperte per sempre (p) o tenute aperte dalla pedana (porta 0) o da qualcuno sotto; o = come sono ora. Le celle si aggiornano su ogni telefono (syncGates)
  function gateTick(G) {
    const RZ = MP().RZ, on = (pt) => active(G).some(c => { const q = P(c); return Math.floor(q.x) === Math.floor(pt.x) && Math.floor(q.y) === Math.floor(pt.y); });
    for (const H of RZ.half) {
      if (!G.R.p[H.g[1]] && on(H.p2[0]) && on(H.p2[1])) { G.R.p[H.g[1]] = 1; say(G, 'p2', { h: H.h }); }
      for (const g of H.g) {
        const inside = RZ.gates[g].cells.some(([x, y]) => active(G).some(c => { const q = P(c); return Math.floor(q.x) === x && Math.floor(q.y) === y; }));
        G.R.o[g] = G.R.p[g] || (g === H.g[0] && on(H.p1)) || (G.R.o[g] && inside) ? 1 : 0;
      }
    }
  }
  function syncGates(G) {
    const RZ = MP().RZ, d = G.R.d || (G.R.d = RZ.gates.map(() => 0));
    RZ.gates.forEach((gt, g) => {
      const o = G.R.o[g] ? 1 : 0; if (d[g] === o) return; d[g] = o;
      for (const [x, y] of gt.cells) { cqSolid[y][x] = o ? null : { prop: 'gate', o: { g, n: gt.n } }; cqBgCell(x, y, 1); }
      if (dxy(G.me, gt.cells[0][0], gt.cells[0][1]) < 14) thud(0.5, 140);
    });
    const lv = G.R.lvd || (G.R.lvd = [0, 0]);
    RZ.half.forEach(H => { if (lv[H.h] !== G.R.lev[H.h]) { lv[H.h] = G.R.lev[H.h]; cqBgCell(Math.floor(H.lev.x), Math.floor(H.lev.y), 1); } });
    const ch = chestOk(G) ? 1 : 0; if (G.chD !== ch) { G.chD = ch; cqBgCell(MP().top.chest[0], MP().top.chest[1], 1); }
    const rf = [0, 1].map(t => ORDER.map(k => OB.count(G, t, k)).join() + (G.go ? G.go.t : '')); for (const t of [0, 1]) if ((G.rfD || [])[t] !== rf[t]) { (G.rfD || (G.rfD = []))[t] = rf[t]; const c = MP().camps[t]; cqBgCell(c.rx, c.ry, 1); }
  }
  // passaggi tra isola e rovine (ingressi a meta' collina <-> scale dell'atrio)
  function portal(G, c) {
    const q = P(c), cx = Math.floor(q.x), cy = Math.floor(q.y); if (G.time - (c.tp || -9) < 1.2) return null;
    for (const m of MP().mouths) if (cx === m.tx && cy === m.ty) { const a = MP().RZ.half[m.h].arr; return { x: a.x, y: a.y }; }
    for (const H of MP().RZ.half) if (cx === H.exit.x && cy === H.exit.y) { const m = MP().mouths[H.h]; return { x: m.ox, y: m.oy }; }
    return null;
  }

  // cronaca: l'host scrive (G.lg), ognuno racconta dal suo punto di vista
  function say(G, k, o) { const e = Object.assign({ n: ++G.lgN, k }, o); G.lg.push(e); if (G.lg.length > 10) G.lg.shift(); show(G, e); }
  function show(G, e) {
    const me = G.me, A = byId(G, e.a), B = byId(G, e.b), an = A ? '<b>' + esc(A.name) + '</b>' : '', bn = B ? '<b>' + esc(B.name) + '</b>' : '';
    const KN = k => OB.KINDS[k] ? OB.KINDS[k].e + ' ' + OB.KINDS[k].a : '';
    let t = '';
    if (e.k === 'kill') {
      t = (e.w === 'g' ? '💥 ' : '🔪 ') + (A === me ? bn + ' ti ha ' + (e.w === 'g' ? 'sparato' : 'colpito') + '! ' + (e.g ? 'Sei un fantasma: guarda la partita (gli altri non ti sentono).' : 'Ti resta una vita: torni al campo tra poco.') : B === me ? 'Hai ' + (e.w === 'g' ? 'sparato a ' : 'colpito ') + an + '!' + (e.g ? ' Ora è un fantasma.' : '') : bn + ' ha ' + (e.w === 'g' ? 'sparato a ' : 'colpito ') + an + (e.g ? ': ora è un fantasma.' : '.'));
      if (e.w === 'g') { beep(160, 0.25, 0.08, 0, 'sawtooth'); beep(90, 0.3, 0.06, 0.04, 'square'); } else for (let i = 0; i < 3; i++) beep(1300 - i * 120, 0.04, 0.035, i * 0.18, 'square');
    }
    else if (e.k === 'take') t = A === me ? '✋ Hai preso ' + KN(e.i) + '! Portala alla zattera.' : A && A.t === me.t ? '✋ ' + an + ' ha preso ' + KN(e.i) + '!' : '⚠️ ' + an + ' (' + TEAMS[A ? A.t : 0].n + ') ha preso ' + KN(e.i) + '!';
    else if (e.k === 'put') { const ok = e.b === me.t; if (A) fly(G, e.i, P(A), raftOf(G, e.b), ok); if (ok) G.pop = { k: e.i, until: G.time + 1.4 }; t = (ok ? '🛠️ ' + (A === me ? 'Hai' : an + ' ha') + ' montato ' : '🛠️ I ' + TEAMS[e.b].n + ' hanno montato ') + KN(e.i) + ' sulla zattera (' + e.c + '/' + TOT + ').'; beep(ok ? 660 : 330, 0.1, 0.04); beep(ok ? 880 : 294, 0.14, 0.04, 0.1); }
    else if (e.k === 'stl') { if (e.b === me.t) { t = '⚠️ Qualcuno sta rubando dalla vostra zattera!'; beep(440, 0.1, 0.05); beep(440, 0.1, 0.05, 0.2); } }
    else if (e.k === 'stolen') { if (A) fly(G, e.i, { x: e.x, y: e.y }, P(A), A === me); if ((A === me || e.b === me.t) && navigator.vibrate) try { navigator.vibrate(A === me ? 120 : [80, 60, 80]); } catch (er) { }
      if (e.b === me.t && A) G.thief = { id: A.id, until: G.time + 6 }; beep(e.b === me.t ? 300 : 880, 0.15, 0.05); beep(e.b === me.t ? 220 : 1175, 0.2, 0.05, 0.12); }
    if (e.k === 'stolen') t = A === me ? '🫳 Hai rubato ' + KN(e.i) + ' ai ' + TEAMS[e.b].n + '! Scappa!' : e.b === me.t ? '😱 ' + an + ' vi ha rubato ' + KN(e.i) + '!' : '🫳 ' + an + ' ha rubato ' + KN(e.i) + ' ai ' + TEAMS[e.b].n + '!';
    else if (e.k === 'drop') t = A === me ? '💢 ' + bn + ' ti ha fatto cadere ' + KN(e.i) + '!' : B === me ? '💢 Hai fatto cadere ' + KN(e.i) + ' a ' + an + '!' : '';
    else if (e.k === 'full') t = A === me ? '✋ Avete già tutti i pezzi così: tienilo (così non lo prendono gli altri) oppure lascialo.' : '';
    else if (e.k === 'chop') { if (A === me) { t = '🪵 Tronco tagliato! Portalo alla zattera.'; beep(392, 0.1, 0.05); beep(523, 0.14, 0.05, 0.1); } }
    else if (e.k === 'lev') t = A === me ? '🔧 Hai tirato la leva: la porta resta aperta!' : A && A.t === me.t ? '🔧 ' + an + ' ha tirato la leva delle rovine.' : '';
    else if (e.k === 'p2') t = me.t === e.h || lvl(cq.x) ? '🟫 Le due pedane insieme: una porta delle rovine si è aperta!' : '';
    else if (e.k === 'gear') { t = '⚙️ ' + (A === me ? 'Hai' : an + ' ha') + ' allineato gli ingranaggi: la stanza della bussola è aperta!'; beep(523, 0.12, 0.05); beep(784, 0.2, 0.05, 0.12); }
    else if (e.k === 'chest') t = A === me ? '💰 Hai trovato ' + CHEST_N + ' monete nel forziere!' : A && A.t === me.t ? '💰 ' + an + ' ha aperto il forziere.' : '';
    else if (e.k === 'buy') t = A === me ? '🛒 Hai comprato: ' + SHOP[e.i][1] + '.' : A && A.t === me.t ? '🛒 ' + an + ' ha comprato: ' + SHOP[e.i][1] + '.' : '';
    else if (e.k === 'night') { t = '🌙 Scende la notte: si vede solo vicino alle torce. I cespugli diventano ancora più utili…'; beep(330, 0.4, 0.03, 0, 'triangle'); beep(262, 0.6, 0.03, 0.3, 'triangle'); }
    else if (e.k === 'sail') { const ok = e.b === me.t; t = '⛵ La zattera ' + TEAMS[e.b].f + ' prende il largo!'; beep(ok ? 523 : 330, 0.15, 0.06); beep(ok ? 659 : 294, 0.15, 0.06, 0.15); beep(ok ? 784 : 262, 0.4, 0.06, 0.3); }
    if (t) cqToast(t);
  }

  function fly(G, k, a, b, big) { G.flyFx.push({ k, x0: a.x, y0: a.y, x1: b.x, y1: b.y, t0: performance.now(), big }); }

  // ======================= PERSONAGGI DEL COMPUTER =======================
  function go(G, c, x, y) {
    if (!cqCellFree(Math.floor(x), Math.floor(y))) { const q = cqSpot(Math.floor(x), Math.floor(y)); x = q.x; y = q.y; }   // oggetto (zattera, forziere...): la cella libera accanto
    const lc = lvl(c.x), lt = lvl(x);
    if (lc === lt) { c.path = cqPath(c.x, c.y, x, y); return c.path.length > 0 || Math.hypot(c.x - x, c.y - y) < 0.8; }
    if (lc === 0) { const inComp = x >= RX + 16 && x < RX + 24; const h = inComp ? c.t : (x < RX + 20 ? 0 : 1), m = MP().mouths[h]; c.path = cqPath(c.x, c.y, m.tx + 0.5, m.ty + 0.5); return c.path.length > 0; }
    for (const h of [roomHalf(c), 1 - roomHalf(c)]) { const e = MP().RZ.half[h].exit, p = cqPath(c.x, c.y, e.x + 0.5, e.y + 0.5); if (p.length) { c.path = p; return true; } }
    c.path = []; return false;
  }
  const roomHalf = c => c.x < RX + 20 ? 0 : 1;
  function flee(G, c, th) {
    const q = P(th); let best = null, bs = -1e9;
    for (let i = 0; i < 10; i++) { const a = Math.random() * 7, x = Math.floor(c.x + Math.cos(a) * 4), y = Math.floor(c.y + Math.sin(a) * 4); if (!cqCellFree(x, y)) continue; const s = Math.hypot(x + 0.5 - q.x, y + 0.5 - q.y); if (s > bs) { bs = s; best = { x: x + 0.5, y: y + 0.5 }; } }
    if (best) c.path = cqPath(c.x, c.y, best.x, best.y).slice(0, 4);
  }
  function wander(G, c) {
    if (c.path.length && Math.random() > 0.05) return;
    for (let i = 0; i < 30; i++) { const a = Math.random() * 7, r = 4 + Math.random() * 36, x = Math.floor(C + Math.cos(a) * r), y = Math.floor(C + Math.sin(a) * r); if (cqCellFree(x, y)) { if (go(G, c, x + 0.5, y + 0.5)) return; } }
  }
  function cover4(c) {   // nascondiglio piu' vicino entro 6
    let b = null, bd = 6;
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const x = Math.floor(c.x) + dx, y = Math.floor(c.y) + dy; if (cqCellFree(x, y) && cover(x + 0.5, y + 0.5)) { const d = Math.hypot(dx, dy); if (d < bd) { bd = d; b = { x: x + 0.5, y: y + 0.5 }; } } }
    return b;
  }
  function bot(G, c) {
    if (c.op) return;
    const t = c.t, h = held(G, c), foes = active(G).filter(e => e.t !== t && canSee(G, c, e)), RZ = MP().RZ;
    // attacco
    const v = stabTarget(G, c);
    if (v && G.time >= (c.kcd || 0) && (held(G, v) || v.op || held(G, c) || (c.role === 'd' && nearRaft(G, c, t)) || Math.random() < 0.12)) { doAct(G, c, { k: 'stab', v: v.id }); return; }   // sempre chi porta o ruba, gli altri ogni tanto
    const gt = gunTarget(G, c); if (gt && Math.random() < 0.4) { doAct(G, c, { k: 'shoot', v: gt.id }); return; }
    if (c.hd) { if (foes.some(e => dist(c, e) < 2.6) || Math.random() < 0.02) { c.hd = 0; } else return; }
    // con un pezzo in mano: alla zattera
    if (h) {
      if (need(G, t, h.k) < 0 && OB.count(G, t, h.k) >= NEED[h.k]) { OB.drop(G, h, c.x, c.y, c); return; }
      const th = foes.find(e => dist(c, e) < 2.4 && !nearRaft(G, c, t)); if (th && Math.random() < 0.35) { flee(G, c, th); return; }
      const r = raftOf(G, t); go(G, c, r.x, r.y); return;
    }
    // un nemico vicino che porta un pezzo: inseguirlo
    const car = foes.filter(e => held(G, e)).sort((a, b) => dist(c, a) - dist(c, b))[0];
    if (car && (c.role === 'd' || dist(c, car) < 8)) { const q = P(car); go(G, c, q.x, q.y); return; }
    // ladri alla mia zattera
    const thief = active(G).find(e => e.t !== t && e.op && e.op.k === 'steal'); if (thief && (c.role === 'd' || dist(c, thief) < 12)) { const q = P(thief); go(G, c, q.x, q.y); return; }
    // monete e mercante
    if ((c.co || 0) >= 5 && !(c.gun > 0) && lvl(c.x) === 0 && dxy(c, C, C) < 16) { const tr = MP().top.trader; if (nearTrader(c)) { doAct(G, c, { k: 'buy', i: 1 }); return; } go(G, c, tr[0] + 0.5, tr[1] + 0.5); return; }
    if (chestOk(G) && lvl(c.x) === 0 && dxy(c, C, C) < 9 && (c.co || 0) < 6) { const ch = MP().top.chest; if (nearChest(c)) { doAct(G, c, { k: 'chest' }); return; } go(G, c, ch[0] + 0.5, ch[1] + 0.5); return; }
    // esploratori: la bussola nelle rovine
    const comp = G.it.find(i => i.k === 'comp');
    const hp = G.hlp || (G.hlp = [-1, -1]); if (hp[t] < 0 && c.role === 'g' && comp.st === 0 && G.chars.some(o => o.t === t && !o.bot && o.alive && lvl(P(o).x))) { hp[t] = c.id; c.role = 'x'; }   // una persona della squadra e' nelle rovine: un computer la raggiunge
    if (c.role === 'x' && comp.st === 0 && lvl(comp.x) === 1 && G.time > 4) { if (ruins(G, c, comp)) return; }
    // difensore: vicino alla zattera, di notte nascosto
    if (c.role === 'd') {
      const r = raftOf(G, t);
      if (dark(G) > 0.5 && dxy(c, r.x, r.y) < 7) { if (cover(c.x, c.y)) { if (!foes.length) { c.hd = 1; c.path = []; } return; } const cv = cover4(c); if (cv && dxy(c, r.x, r.y) < 8) { go(G, c, cv.x, cv.y); return; } }
      if (dxy(c, r.x, r.y) > 6 || !c.path.length) { for (let i = 0; i < 12; i++) { const a = Math.random() * 7, rr = 1.5 + Math.random() * 4, x = Math.floor(r.x + Math.cos(a) * rr), y = Math.floor(r.y + Math.sin(a) * rr); if (cqCellFree(x, y)) { go(G, c, x + 0.5, y + 0.5); break; } } }
      return;
    }
    // raccogliere: il pezzo che serve piu' vicino tra quelli che la squadra conosce
    let best = null, bd = 1e9;
    for (const it of G.it) {
      if (it.st !== 0 || !G.kn[t].has(it.id) || need(G, t, it.k) <= 0 || lvl(it.x) !== 0) continue;
      const d = Math.hypot(it.x - c.x, it.y - c.y) + (G.chars.some(o => o !== c && o.t === t && o.bot && o.gl === it.id) ? 25 : 0);
      if (d < bd) { bd = d; best = it; }
    }
    if (best) { c.gl = best.id; go(G, c, best.x, best.y); return; }
    c.gl = -1;
    if (need(G, t, 'log') > 0 && lvl(c.x) === 0) {   // legna: l'albero piu' vicino che nessun compagno sta gia' tagliando
      const ti = treeNear(G, c); if (ti >= 0 && !G.chars.some(o => o !== c && o.op && o.op.k === 'chop' && o.op.i === ti)) { doAct(G, c, { k: 'chop' }); return; }
      let tb = -1, td = 1e9; MP().trees.forEach((tr, i) => { if (G.cut[i] || lvl(tr.x)) return; const d = Math.hypot(tr.x - c.x, tr.y - c.y) + (G.chars.some(o => o !== c && o.t === t && o.tr === i) ? 30 : 0); if (d < td) { td = d; tb = i; } });
      if (tb >= 0) { c.tr = tb; const tr = MP().trees[tb]; go(G, c, tr.x + 0.5, tr.y + 0.5); return; }
    }
    // rubare alla zattera nemica quello che manca (prima vela e bussola)
    const en = 1 - t, want = ORDER.find(k => need(G, t, k) > 0 && OB.count(G, en, k) > 0 && !G.it.some(i => i.k === k && i.st === 0 && G.kn[t].has(i.id)));
    if (want && (want === 'comp' || want === 'sail' || Math.random() < 0.5)) { if (nearRaft(G, c, en)) { doAct(G, c, { k: 'steal' }); return; } const r = raftOf(G, en); go(G, c, r.x, r.y); return; }
    wander(G, c);
  }
  // le rovine per gli esploratori: pedana + leva, due pedane, ingranaggi, bussola
  function ruins(G, c, comp) {
    const RZ = MP().RZ, H = RZ.half[c.t], xs = G.chars.filter(o => o.alive && o.t === c.t && o.role === 'x' && !jailed(G, o)).sort((a, b) => a.id - b.id), k = xs.indexOf(c);
    const there = (pt, r = 0.5) => dxy(c, pt.x, pt.y) < r;
    const to = pt => { if (!there(pt)) go(G, c, pt.x, pt.y); else c.path = []; };
    const open = g => !!G.R.o[g];
    if (lvl(c.x) && cqPath(c.x, c.y, comp.x, comp.y).length) { go(G, c, comp.x, comp.y); return true; }   // la stanza della bussola e' raggiungibile
    const mate = pt => G.chars.some(o => o !== c && o.t === c.t && o.alive && !jailed(G, o) && dxy(o, pt.x, pt.y) < 0.75);
    if (!G.R.p[H.g[0]] && mate(H.p1)) { if (there(H.lev, 1.4)) doAct(G, c, { k: 'lev', i: c.t }); else go(G, c, H.lev.x, H.lev.y); return true; }
    if (!G.R.p[H.g[1]] && G.R.p[H.g[0]] && (mate(H.p2[0]) || mate(H.p2[1]))) { to(mate(H.p2[0]) ? H.p2[1] : H.p2[0]); return true; }
    if (!G.R.p[H.g[0]]) {
      if (k <= 0) { if (xs.length < 2 && !G.chars.some(o => o.t === c.t && !o.bot && o.alive && lvl(P(o).x)) && G.time - (c.wt || (c.wt = G.time)) > 30) { c.role = 'g'; return false; } to(H.p1); return true; }
      if (open(H.g[0]) || lvl(c.x) && c.y < H.p1.y - 5) { if (there(H.lev, 1.4)) doAct(G, c, { k: 'lev', i: c.t }); else go(G, c, H.lev.x, H.lev.y); return true; }
      to({ x: H.p1.x - 2, y: H.p1.y - 3 }); return true;
    }
    if (!G.R.p[H.g[1]]) { to(H.p2[k === 1 ? 1 : 0]); return true; }
    if (!G.R.p[H.g[2]]) {
      if (k <= 0) { if (there(H.gear, 1.4)) { c.path = []; if ((c.gw = (c.gw || 0) + 0.5) > c.gneed) doAct(G, c, { k: 'gearok', i: H.g[2] }); } else go(G, c, H.gear.x, H.gear.y); return true; }
      to({ x: H.gear.x + (c.t ? 2 : -2), y: H.gear.y + 2 }); return true;
    }
    go(G, c, comp.x, comp.y); return true;
  }

  // ======================= ENIGMA DEGLI INGRANAGGI =======================
  // 4 ruote dentate in fila che si toccano: girarne una fa girare al contrario quelle accanto. Tutte le frecce in alto = aperto.
  // Mescolate col seme della mappa (uguali per i compagni: ci si puo' aiutare a voce), la soluzione la si cerca sul proprio telefono.
  // si parte sempre da una posizione che chiede almeno 10 mosse (le piu' difficili ne chiedono 16): distanze calcolate una volta sola
  let GD = null;
  function gearStart(g) {
    if (!GD) { GD = { '0000': 0 }; const q = [[0, 0, 0, 0]]; while (q.length) { const a = q.shift(), k = a.join(''); for (let i = 0; i < 4; i++) for (const d of [1, -1]) { const b = a.slice(); turn(b, i, d); const kb = b.join(''); if (!(kb in GD)) { GD[kb] = GD[k] + 1; q.push(b); } } } }
    const r = MG.rnd((MP().seed | 0) * 31 + g * 7 + 3), hard = Object.keys(GD).filter(k => GD[k] >= 10 && GD[k] <= 13);
    return [...hard[Math.floor(r() * hard.length)]].map(Number);
  }
  function turn(s, i, d) { s[i] = (s[i] + d + 8) % 8; if (i > 0) s[i - 1] = (s[i - 1] - d + 8) % 8; if (i < 3) s[i + 1] = (s[i + 1] - d + 8) % 8; }
  function gearUI(G, g) {
    const st = cq.nfGear || (cq.nfGear = {}), key = MP().seed + ':' + g, s = st[key] || (st[key] = gearStart(g));
    cqCloseTask();
    $('#tkTitle').textContent = '⚙️ La porta degli ingranaggi';
    $('#tkBody').innerHTML = `<p class="lead">Gira le ruote finché <b>tutte le frecce guardano in alto</b> (verso il segno d'oro). Attento: le ruote si toccano, girarne una fa girare <b>al contrario</b> quelle accanto.</p>
      <canvas id="nfGc" width="600" height="300" style="width:100%;max-width:330px;display:block;margin:6px auto;background:#2a241c;border-radius:12px"></canvas>
      <div style="display:flex;justify-content:space-around;max-width:330px;margin:0 auto">${[0, 1, 2, 3].map(i => `<div style="display:flex;flex-direction:column;gap:6px"><button class="btn" data-r="${i}" data-d="-1" type="button">⟲</button><button class="btn" data-r="${i}" data-d="1" type="button">⟳</button></div>`).join('')}</div>`;
    $('#tkHint').textContent = 'Si possono aiutare i compagni a voce: le ruote sono uguali per tutta la squadra.'; $('#tkClose').hidden = false; $('#cqTask').hidden = false;
    $('#tkClose').onclick = () => cqCloseTask();
    const cv = $('#nfGc'), gc = cv.getContext('2d'); let ang = s.map(v => v), done = false;
    const drawG = () => {
      gc.clearRect(0, 0, 600, 300);
      for (let i = 0; i < 4; i++) {
        const X = 90 + i * 140, Y = 160, R = 64, a = ang[i] * Math.PI / 4 + (i % 2 ? Math.PI / 8 : 0) * 0;
        gc.fillStyle = '#e8c040'; gc.beginPath(); gc.moveTo(X, Y - R - 30); gc.lineTo(X - 10, Y - R - 46); gc.lineTo(X + 10, Y - R - 46); gc.fill();
        gc.save(); gc.translate(X, Y); gc.rotate(a);
        gc.fillStyle = s[i] === 0 ? '#c8a040' : '#9a7a3a';
        for (let k = 0; k < 8; k++) { gc.save(); gc.rotate(k * Math.PI / 4 + Math.PI / 8); gc.fillRect(-11, -R - 12, 22, 22); gc.restore(); }
        gc.beginPath(); gc.arc(0, 0, R, 0, 7); gc.fill(); gc.fillStyle = '#5a4520'; gc.beginPath(); gc.arc(0, 0, 18, 0, 7); gc.fill();
        gc.fillStyle = '#f4ecd2'; gc.beginPath(); gc.moveTo(0, -R + 6); gc.lineTo(-14, -R + 34); gc.lineTo(14, -R + 34); gc.fill(); gc.fillRect(-5, -R + 30, 10, 26);
        gc.restore();
      }
    };
    const anim = () => { let mv = false; for (let i = 0; i < 4; i++) { let d = s[i] - ang[i]; if (d > 4) d -= 8; if (d < -4) d += 8; if (Math.abs(d) > 0.02) { ang[i] += d * 0.3; mv = true; } else ang[i] = s[i]; } drawG(); if (mv && !$('#cqTask').hidden) requestAnimationFrame(anim); };
    drawG();
    $('#tkBody').querySelectorAll('[data-r]').forEach(b => { b.onclick = () => {
      if (done) return; turn(s, +b.dataset.r, +b.dataset.d); thud(0.25, 300 + 60 * +b.dataset.r); requestAnimationFrame(anim);
      if (s.every(v => v === 0)) { done = true; beep(523, 0.12, 0.05); beep(659, 0.12, 0.05, 0.12); beep(1047, 0.3, 0.05, 0.24); setTimeout(() => { cqCloseTask(); }, 700);
        const G2 = cq.g; if (G2 && G2.mode === 'naufraghi') { if (G2.guest) cqNetSend({ k: 'a', a: 'gearok', i: g }); else doAct(G2, G2.me, { k: 'gearok', i: g }); } }
    }; });
  }
  function shopUI(G) {
    const me = G.me; cqCloseTask();
    $('#tkTitle').textContent = '🛒 Il mercante della cima';
    $('#tkBody').innerHTML = `<p class="lead">Hai <b>${me.co || 0} 🪙</b>. Le monete si trovano nel forziere accanto alla statua.</p>` + SHOP.map((s, i) => `<button class="gcard hg" type="button" data-b="${i}" ${(me.co || 0) < s[2] ? 'style="opacity:.5"' : ''}><span class="gi" style="background:#8a6a2f">${s[1].split(' ')[0]}</span><span><div class="gt">${esc(s[1].slice(s[1].indexOf(' ') + 1))} · ${s[2]} 🪙</div><div class="gs">${esc(s[3])}</div></span></button>`).join('');
    $('#tkHint').textContent = ''; $('#tkClose').hidden = false; $('#cqTask').hidden = false; $('#tkClose').onclick = () => cqCloseTask();
    $('#tkBody').querySelectorAll('[data-b]').forEach(b => { b.onclick = () => {
      const i = +b.dataset.b; if ((me.co || 0) < SHOP[i][2]) { cqToast('🪙 Non hai abbastanza monete.'); return; }
      if (G.guest) { cqNetSend({ k: 'a', a: 'buy', i }); me.co -= SHOP[i][2]; me.coH = G.time + 1.5; } else doAct(G, me, { k: 'buy', i });
      beep(988, 0.08, 0.04); beep(1319, 0.12, 0.04, 0.08); cqCloseTask();
    }; });
  }

  // ======================= TACCUINO DEGLI INDIZI E STILE =======================
  // pulsante 📜 sotto la barra (solo in partita a Naufraghi): apre l'elenco degli indizi, con la spunta su quelli gia' trovati
  if (!document.getElementById('nfCss')) {
    const st = document.createElement('style'); st.id = 'nfCss';
    st.textContent = '.nfRec{font-size:17px;letter-spacing:1px;white-space:nowrap}.nfK{margin:0 5px}.nfNo{filter:grayscale(1);opacity:.32}.nfBl{animation:nfBl .7s infinite alternate}.nfPop{display:inline-block;animation:nfPop .9s ease-out}.nfSub{font-size:12px;font-weight:600;opacity:.9;margin-top:2px}@keyframes nfBl{from{opacity:.25}to{opacity:1}}@keyframes nfPop{0%{transform:scale(2.2)}60%{transform:scale(.9)}100%{transform:scale(1)}}#nfNote{position:absolute;left:12px;top:128px;padding:6px 11px;border-radius:12px;border:0;background:rgba(60,44,22,.85);color:#f4e6c4;font:inherit;font-weight:700;font-size:13px;box-shadow:0 3px 10px rgba(0,0,0,.3)}';
    document.head.appendChild(st);
    const b = document.createElement('button'); b.id = 'nfNote'; b.type = 'button'; b.hidden = true; b.onclick = () => noteUI(cq.g);
    const host = document.getElementById('ciack'); if (host) host.appendChild(b);
    setInterval(() => { const G = cq.g, on = !!(G && G.mode === 'naufraghi' && G.phase === 'play' && G.it && G.pre <= 0 && $('#cqTask').hidden && !$('#ciack').hidden); if (b.hidden === on) b.hidden = !on; if (on) { const n = G.cl.filter(c => !found(G, c)).length, t = '📜 Indizi' + (n ? ' (' + n + ')' : ' ✓'); if (b.textContent !== t) b.textContent = t; } }, 300);
  }
  const found = (G, c) => { const it = G.it[c.id]; return !it || it.st !== 0 || it.x !== it.x0 || it.y !== it.y0; };
  function noteUI(G) {
    if (!G || !G.cl) return; cqCloseTask();
    $('#tkTitle').textContent = '📜 Taccuino degli indizi';
    $('#tkBody').innerHTML = '<p class="lead">Dove si trovano i pezzi della zattera:</p>' + G.cl.map(c => '<p style="margin:8px 0;' + (found(G, c) ? 'opacity:.5;text-decoration:line-through' : '') + '">' + (found(G, c) ? '✅ ' : '🔎 ') + esc(c.t) + '</p>').join('') + '<p class="hint" style="margin-top:12px">🪵 I tronchi si tagliano dagli alberi (🪓 Taglia, 2 secondi fermo). Quando un pezzo è già stato preso, l\'indizio è barrato: qualcuno lo sta portando… o lo ha lasciato da qualche parte!</p>';
    $('#tkHint').textContent = ''; $('#tkClose').hidden = false; $('#cqTask').hidden = false; $('#tkClose').onclick = () => cqCloseTask();
  }

  // ======================= IL GIOCO NEL MOTORE =======================
  function setup(G) {
    G.it = OB.make(MP().items); G.R = { p: MP().RZ.gates.map(() => 0), o: MP().RZ.gates.map(() => 0), lev: [0, 0] };
    for (const it of G.it) if (it.k === 'log') it.st = 3;
    G.cut = {}; G.fall = []; G.flyFx = []; G.pop = null; G.thief = null;
    G.lg = []; G.lgN = 0; G.fx = []; G.chest = 0; G.mapT = [0, 0]; G.go = null; G.kn = [new Set(), new Set()]; G.night = false;
    G.left = G.opt.time || 300; cq.mapDirty = true;
    G.chD = 1; G.rfD = ['', ''].map((v, t) => ORDER.map(() => 0).join() );   // forziere chiuso e zattere vuote: come nella mappa pronta (niente ridisegno all'inizio)   // porte e leve cambiano la mappa: la prossima partita la rifa' da capo
    const lms = MP().lms; G.cl = G.it.filter(i => i.k === 'sail' || i.k === 'rope').map(i => ({ id: i.id, t: IZ.clue((i.k === 'sail' ? '⛵ La vela' : '🪢 Una corda'), i.x, i.y, lms, C, C) }));
    G.cl.push({ id: G.it.find(i => i.k === 'comp').id, t: '🧭 La bussola è nel cuore delle rovine: gli ingressi sono a metà collina.' });
  }
  CQ_MODES.naufraghi = {
    n: 'Naufraghi',
    desc: '🏝️ Due squadre naufragate, <b>Granchi</b> 🦀 e <b>Delfini</b> 🐬, su un\'isola diversa ogni volta. Costruite la <b>zattera</b> al vostro campo: 4 tronchi 🪵, 2 corde 🪢 (poche!), la <b>vela</b> ⛵ (una sola) e la <b>bussola</b> 🧭 (una sola, nel cuore delle rovine). Salpa chi la finisce per primo. Un pezzo alla volta in mano. Si ruba tutto: da terra, toccando chi porta un pezzo, o dalla zattera nemica. 🔪 Gli avversari si colpiscono: 2 vite, poi fantasma. 🌿 Nasconditi nei cespugli o dietro le grandi rocce per le imboscate. ⛰️ Sulla cima: forziere 💰 e mercante 🛒. Nelle rovine servono almeno in due: pedane, leva e la porta degli ingranaggi. A metà partita scende la notte.',
    maps: [['isola', 'Isola misteriosa']], TEAMS, SHOP,
    def: { time: 420, map: 'isola', n: 8, fill: true },
    opts: o => `<div class="row"><div class="lbl">Durata</div>${seg('time', [[300, '5:00'], [420, '7:00'], [600, '10:00']], o.time || 420)}</div>`,
    read: d => ({ time: +d.get('time') || 420 }),
    start(G) {
      setup(G); G.pre = 7;   // 7 s di "come si gioca" prima di partire
      const sh = SQ.split(G);
      for (const t of [0, 1]) {
        const bots = sh.filter(c => c.t === t && c.bot), n = sh.filter(c => c.t === t).length;
        bots.forEach((c, i) => { c.role = i < 2 && n >= 2 ? 'x' : i === 2 && n >= 4 ? 'd' : 'g'; c.gneed = 60 + Math.random() * 50; });
      }
      for (const c of G.chars) { Object.assign(c, { lv: LIVES, jail: 0, safe: 0, hd: 0, co: 0, gun: 0, fast: 0, kcd: 0, st: 0, pc: 0, tg: 0, op: null, gl: -1 }); const s = SQ.spawn(MP().camps[c.t], 6); c.x = s.x; c.y = s.y; c.path = []; }
    },
    gstart(G) { setup(G); for (const c of G.chars) Object.assign(c, { lv: LIVES, hd: 0, co: 0, gun: 0 }); },
    intro: G => { const T = TEAMS[G.me.t || 0]; return T.e + ' Sei nei ' + T.n + ': costruite la ZATTERA e salpate per primi!\n🪵 ×4  tagliali dagli alberi 🪓\n🪢 ×2  sparse sull\'isola: leggi gli indizi 📜\n⛵ ×1  una sola per tutti!\n🧭 ×1  nel cuore delle rovine ⛏️\nSi parte tra'; },
    speed(c) { const G = cq.g; if (!G || !G.it) return 1; if (!c.alive) return 1.1; if (jailed(G, c)) return 0; return OB.speed(G, c) * (fastOn(G, c) ? 1.3 : 1); },
    big(G) {
      const me = G.me; if (me.t == null) return '';
      if (G.go) return '⛵ La zattera ' + TEAMS[G.go.t].f + ' salpa! ' + Math.max(0, Math.ceil(G.go.at - G.time)) + '…';
      if (!me.alive) return '👻 Sei un fantasma: guardi la partita (gli altri non ti sentono).';
      if (jailed(G, me)) return '🔪 Colpito! Torni al campo tra ' + Math.ceil(me.jail - G.time) + '…';
      if (me.op) return me.op.k === 'steal' ? '🫳 Rubando… resta fermo!' : '💰 Apro il forziere… resta fermo!';
      if (me.hd) return '🌿 Nascosto: chi è dell\'altra squadra non ti vede. Muoviti per uscire.';
      if (lvl(cq.x)) for (const H2 of MP().RZ.half) {
        const at = (pt, r) => Math.hypot(cq.x - pt.x, cq.y - pt.y) < r, gc = MP().RZ.gates[H2.g[0]].cells[0];
        if (!G.R.p[H2.g[0]] && at(H2.p1, 0.7)) return '🟫 Resta sulla pedana: la porta è aperta finché ci stai sopra. Un compagno passi e tiri la leva di là!';
        if (!G.R.p[H2.g[0]] && !G.R.o[H2.g[0]] && at({ x: gc[0] + 1, y: gc[1] + 0.5 }, 2.6)) return '🚪 Porta chiusa: qualcuno deve stare sulla pedana (il quadrato dorato) in fondo alla stanza.';
        if (G.R.p[H2.g[0]] && !G.R.p[H2.g[1]] && (at(H2.p2[0], 0.7) || at(H2.p2[1], 0.7))) return '🟫 Servono due persone sulle due pedane insieme per aprire la porta!';
      }
      return '';
    },
    // barra in alto: la RICETTA della mia zattera (montati a colori, in mano ai compagni che lampeggiano, mancanti grigi) e sotto il resto
    hud(G) {
      const me = G.me; if (me.t == null || !G.it) return '🏝️ Naufraghi';
      const T = TEAMS[me.t], E = TEAMS[1 - me.t], hearts = me.alive ? '❤️'.repeat(Math.max(0, me.lv || 0)) : '👻';
      const rec = SHOW.map(k => {
        const have = Math.min(NEED[k], OB.count(G, me.t, k)), car = G.it.filter(i => i.st === 1 && i.k === k && (byId(G, i.c) || {}).t === me.t).length, e = OB.KINDS[k].e, pop = G.pop && G.pop.k === k && G.pop.until > G.time;
        let o = ''; for (let i = 0; i < NEED[k]; i++) o += i < have ? '<span class="' + (pop && i === have - 1 ? 'nfPop' : '') + '">' + e + '</span>' : i < have + car ? '<span class="nfBl">' + e + '</span>' : '<span class="nfNo">' + e + '</span>';
        return '<span class="nfK">' + o + '</span>';
      }).join('');
      return `<div class="nfRec">${T.e} <b style="color:${T.l}">Zattera</b> ${rec}</div><div class="nfSub">${E.e} ${E.n} ${pieces(G, 1 - me.t)}/${TOT} · ${hearts} · 🪙 ${me.co || 0}${me.gun > 0 ? ' · 🔫' + me.gun : ''}${fastOn(G, me) ? ' · 👟' : ''} · ${dark(G) > 0.5 ? '🌙' : '☀️'} ${mmss(Math.max(0, G.left))}</div>`;
    },
    hide: c => { const G = cq.g; return jailed(G, c) || (G.me.alive && c.t !== G.me.t && (!!c.hd || (!lvl(c.x) && !lvl(cq.x) && !los(cq.x, cq.y, c.x, c.y)))); },   // nascosto o dietro la collina
    nameCol: c => c.t != null ? TEAMS[c.t].l : null,
    btn(G) { const a = action(G, G.me); return a ? { t: a.t, on: a.on } : null; },
    act(G) {
      const me = G.me, a = action(G, me); if (!a || !a.on) return;
      if (a.k === 'gear') { gearUI(G, a.i); return; }
      if (a.k === 'shop') { shopUI(G); return; }
      if (a.k === 'hide' || a.k === 'unhide') { me.hd = a.k === 'hide' ? 1 : 0; me.hdH = G.time + 1; me.hdX = cq.x; me.hdY = cq.y; if (G.guest) cqNetSend({ k: 'hd', v: me.hd }); beep(me.hd ? 500 : 700, 0.06, 0.03); return; }
      if (G.guest) cqNetSend({ k: 'a', a: a.k, v: a.v, i: a.i }); else doAct(G, me, a);
    },
    ev(G, c, o) { if (!o) return; if (o.k === 'hd') { if (!o.v) c.hd = 0; else if (cover(c.x, c.y)) c.hd = 1; } else if (o.k === 'a') doAct(G, c, { k: o.a, v: o.v, i: o.i }); },
    voice: SQ.voice,
    // su ogni telefono: passaggi isola <-> rovine, esco dal nascondiglio se mi muovo, porte e forziere disegnati come sono
    local(G, dt) {
      const me = G.me; if (!G.it) return;
      if (me.alive && !jailed(G, me)) { const to = portal(G, me); if (to) { cq.x = to.x; cq.y = to.y; me.tp = G.time; cq.bgNear = null; thud(0.4, 200); } }
      if (me.hd && Math.hypot(cq.x - (me.hdX != null ? me.hdX : cq.x), cq.y - (me.hdY != null ? me.hdY : cq.y)) > 0.25) { me.hd = 0; me.hdH = G.time + 1; if (G.guest) cqNetSend({ k: 'hd', v: 0 }); }
      if (me.hd && me.hdX == null) { me.hdX = cq.x; me.hdY = cq.y; }
      if (!me.hd) me.hdX = me.hdY = null;
      syncGates(G); syncTrees(G);
      // colpi d'ascia di chi sta tagliando vicino a me
      for (const c of G.chars) if (c.op && c.op.k === 'chop' && Math.hypot(c.x - cq.x, c.y - cq.y) < 12 && (c.axT = (c.axT || 0) - dt) <= 0) { c.axT = 0.45; thud(0.35, 480 + Math.random() * 120); }
      G.fx = G.fx.filter(f => G.time - f[4] < 0.5);
    },
    tick(G, dt) {
      G.left -= dt;
      if (!G.night && dark(G) > 0.5) { G.night = true; say(G, 'night', {}); }
      for (const c of G.chars) if (c.jail && c.jail <= G.time && c.alive) revive(G, c);
      // computer: passaggi tra isola e rovine
      for (const c of G.chars) if (c.bot && c.alive && !jailed(G, c)) { const to = portal(G, c); if (to) { c.x = to.x; c.y = to.y; c.tp = G.time; c.path = []; } }
      gateTick(G);
      for (const i in G.cut) if (G.cut[i] <= G.time) delete G.cut[i];   // l'albero ricresce
      // pezzi: chi esce o e' colpito li lascia; chi ci passa sopra li prende; alla propria zattera si montano; toccare chi porta lo fa cadere
      OB.orphans(G, c => !c.alive || jailed(G, c));
      for (const c of active(G)) {
        const p = P(c);
        if (c.op) { const done = G.time - c.op.t0 >= OPT[c.op.k]; if (Math.hypot(p.x - c.op.x, p.y - c.op.y) > 0.6 || (c.op.k === 'steal' && (held(G, c) || active(G).some(e => e.t !== c.t && !e.hd && dist(e, c) < 1.4)))) c.op = null; else if (done) finishOp(G, c); }
        const got = !c.hd && OB.pickup(G, c, p, PICK, (cc, it) => need(G, cc.t, it.k) > 0 || OB.count(G, 1 - cc.t, it.k) < NEED[it.k] || cc.bot === false);
        if (got) { if (got.k === 'sail' || got.k === 'comp') say(G, 'take', { a: c.id, i: got.k }); G.kn[c.t].add(got.id); }
        const h = held(G, c);
        if (h && nearRaft(G, c, c.t)) {
          if (OB.count(G, c.t, h.k) < NEED[h.k]) { OB.put(G, h, c.t); c.pc = (c.pc || 0) + 1; c.fullW = -1; say(G, 'put', { a: c.id, b: c.t, i: h.k, c: pieces(G, c.t) }); }
          else if (c.fullW !== h.id) { c.fullW = h.id; say(G, 'full', { a: c.id, i: h.k }); }   // la zattera ne ha gia' abbastanza: resta in mano (lo si dice una volta)
        }
      }
      for (const c of active(G)) { const h = held(G, c); if (!h || (c.safe || 0) > G.time) continue; const by = active(G).find(e => e.t !== c.t && !e.hd && dist(e, c) < TOUCH); if (by) { const p = P(c); OB.drop(G, h, p.x, p.y, c); c.stc = G.time + 5; say(G, 'drop', { a: c.id, b: by.id, i: h.k }); } }
      // cosa conosce ogni squadra: i pezzi visti da vicino (e la vela, a meta' partita, anche dal computer)
      if ((G.knT = (G.knT || 0) - dt) <= 0) {
        G.knT = 0.5; const r = dark(G) > 0.5 ? 3.5 : 6;
        for (const c of active(G)) for (const it of G.it) if (it.st === 0 && dxy(c, it.x, it.y) < r && lvl(it.x) === lvl(P(c).x)) G.kn[c.t].add(it.id);
        if (G.time > 150) for (const it of G.it) if (it.k === 'sail') { G.kn[0].add(it.id); G.kn[1].add(it.id); }
      }
      // zattera completa: salpa
      if (!G.go) for (const t of [0, 1]) if (pieces(G, t) >= TOT) { G.go = { t, at: G.time + SAIL_T }; say(G, 'sail', { b: t }); break; }
      if (G.go && G.time >= G.go.at) { this.finish(G); return; }
      // computer
      for (const c of G.chars) {
        if (!c.bot || !c.alive) continue;
        if (jailed(G, c) || c.op || G.go) { c.path = []; c.walk = 0; continue; }
        if ((c.think -= dt) <= 0) { c.think = 0.35 + Math.random() * 0.2; bot(G, c); }
        if (!c.hd) cqModeStep(c, dt, 0.9 * this.speed(c)); else c.walk = 0;
      }
      const alive = [0, 1].map(t => G.chars.some(c => c.t === t && c.alive));
      if (G.left <= 0 || !alive[0] || !alive[1]) this.finish(G);
    },
    finish(G) {
      const a = pieces(G, 0), b = pieces(G, 1), alive = [0, 1].map(t => G.chars.some(c => c.t === t && c.alive));
      const w = G.go ? G.go.t : !alive[0] && alive[1] ? 1 : !alive[1] && alive[0] ? 0 : a > b ? 0 : b > a ? 1 : -1;
      const why = G.go ? '⛵ La zattera ' + TEAMS[w].f + ' ha preso il largo!' : !alive[0] || !alive[1] ? '👻 L\'altra squadra è tutta di fantasmi.' : 'Tempo finito: ' + TEAMS[0].e + ' ' + a + '/' + TOT + ' pezzi – ' + b + '/' + TOT + ' ' + TEAMS[1].e + '.';
      const name = c => c.name + (c === G.me ? ' (tu)' : '');
      SQ.end(G, w, why, c => [name(c), '— ' + TEAMS[c.t].e + ' 🛠️ ' + (c.pc || 0) + ' pezzi · 🫳 ' + (c.st || 0) + ' furti · 🔪 ' + (c.tg || 0) + (c.alive ? '' : ' · 👻')], c => (c.pc || 0) * 10 + (c.st || 0) * 6 + (c.tg || 0) * 3, TEAMS);
    },
    // online: squadra, attesa, vite, nascosto, monete, pistola, scarpe, azione in corso, attesa del colpo, statistiche
    csnap: c => { const G = cq.g, r = v => Math.max(0, Math.round((v - G.time) * 10) / 10); return [c.t, r(c.jail || 0), c.lv || 0, c.hd ? 1 : 0, c.co || 0, c.gun || 0, r(c.fast || 0), c.op ? OPN[c.op.k] : 0, c.op ? Math.round((G.time - c.op.t0) * 10) / 10 : 0, r(c.kcd || 0), c.st || 0, c.pc || 0, c.tg || 0]; },
    capply(G, c, a) {
      c.t = a[0];
      const was = !!c.jail; c.jail = a[1] > 0 ? G.time + a[1] : 0;
      if (was && !c.jail && c.alive) revive(G, c);
      c.lv = a[2];
      if (!(c === G.me && G.time < (c.hdH || 0))) c.hd = a[3];
      if (!(c === G.me && G.time < (c.coH || 0))) c.co = a[4];
      c.gun = a[5]; c.fast = a[6] > 0 ? G.time + a[6] : 0;
      c.op = a[7] ? { k: ['', 'steal', 'chest', 'chop'][a[7]], t0: G.time - a[8], x: c.x, y: c.y } : null;
      c.kcd = a[9] > 0 ? G.time + a[9] : 0; c.st = a[10]; c.pc = a[11]; c.tg = a[12];
    },
    snap: G => ({ cut: Object.keys(G.cut).map(i => [+i, Math.round(G.cut[i] - G.time)]), it: OB.snap(G), p: G.R.p.join(''), o: G.R.o.join(''), lv: G.R.lev.join(''), left: Math.round(G.left * 10) / 10, ch: Math.round(Math.max(0, G.chest - G.time) * 10) / 10, mt: G.mapT.map(v => Math.round(Math.max(0, v - G.time))), go: G.go ? [G.go.t, Math.round((G.go.at - G.time) * 10) / 10] : null, lg: G.lg, fx: G.fx.map(f => f.slice(0, 4).map(v => Math.round(v * 10) / 10)), bd: G.bodies.map(b => [b.id, Math.round(b.x * 100) / 100, Math.round(b.y * 100) / 100, b.face, Math.round(b.t * 10) / 10]) }),
    apply(G, x) {
      if (!G.it) return;
      G.cut = {}; for (const [i, r] of x.cut || []) G.cut[i] = G.time + r;
      OB.apply(G, x.it); G.R.p = [...x.p].map(Number); G.R.o = [...x.o].map(Number); G.R.lev = [...x.lv].map(Number);
      G.left = x.left; G.chest = G.time + x.ch; G.mapT = x.mt.map(v => v > 0 ? G.time + v : 0); G.go = x.go ? { t: x.go[0], at: G.time + x.go[1] } : null;
      for (const f of x.fx || []) if (!G.fx.some(o => o[0] === f[0] && o[1] === f[1] && o[2] === f[2])) G.fx.push(f.concat([G.time]));
      G.bodies = (x.bd || []).map(a => { const c = byId(G, a[0]); return c ? { id: a[0], x: a[1], y: a[2], face: a[3], t: a[4], look: cqLookOf(c), name: c.name } : null; }).filter(Boolean);
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
    },
    // buio: nelle rovine sempre (si vede la stanza dove sono e poco intorno); sull'isola di notte (torce sempre accese)
    night(G) {
      const me = G.me; if (!G.it) return null;
      if (!me.alive) { const d = lvl(cq.x) ? 0.5 : 0.45 * dark(G); return d > 0 ? { a: d, r: 6, lights: [], see: () => true } : null; }
      const lights = [];
      if (lvl(cq.x)) {
        const ri = ruinRoom(G), R = CQ_ROOMS[ri], ig = Math.min(1, (performance.now() - (G.rrT || 0)) / 500);   // la torcia si accende (mezzo secondo)
        lights.push([cq.x, cq.y, 3.2, 0.95 * ig]);
        if (R) lights.push([R.x + R.w / 2, R.y + R.h / 2, Math.max(R.w, R.h) * 0.72, 0.75 * ig]);
        for (const c of G.chars) if (c !== me && c.alive && !jailed(G, c) && lvl(c.x) && c.t === me.t && roomAt(c.x, c.y) === ri) lights.push([c.x, c.y, 2.6, 0.8]);
        return { a: 0.94, r: 3.2, lights, see: (x, y) => lvl(x) === 1 && (Math.hypot(x - cq.x, y - cq.y) < 1.6 || roomAt(x, y) === ri) };
      }
      const dk = dark(G); if (dk <= 0) return null;
      lights.push([cq.x, cq.y, 3.6, 0.95]);
      for (const c of G.chars) { if (c === me || !c.alive || jailed(G, c) || lvl(c.x) || (c.hd && c.t !== me.t)) continue; if (Math.hypot(c.x - cq.x, c.y - cq.y) < 22) lights.push([c.x, c.y, 2.8, 0.85]); }
      for (const cp of MP().camps) lights.push([cp.cx + 0.5, cp.cy + 0.5, 3.4, 0.9]);
      lights.push([C + 0.5, C + 0.5, 3.5, 0.75]);
      return { a: 0.9 * dk, r: 3.6, lights, see: (x, y) => lvl(x) === 0 && (dk < 0.5 || Math.hypot(x - cq.x, y - cq.y) < SEEN_T) };
    },
    deco(g, c, X, Y, TW, G) {
      SQ.ring(g, c, X, Y, TW, TEAMS);
      { const q = P(c); if (inBush(q.x, q.y)) { for (const [dx, dy, r, col] of [[-0.22, -0.12, 0.3, '#3f7a36'], [0.2, -0.1, 0.28, '#4a8a40'], [0, -0.02, 0.32, '#45823c']]) { g.fillStyle = col; g.beginPath(); g.ellipse(X + dx * TW, Y + dy * TW, r * TW, r * TW * 0.7, 0, 0, 7); g.fill(); } } }
      if (c.hd) { g.font = Math.round(TW * 0.42) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🌿', X + TW * 0.38, Y - TW * 1.2); }
      if (c.op) { const k = Math.min(1, (G.time - c.op.t0) / OPT[c.op.k]); g.strokeStyle = ({ steal: '#ff6050', chest: '#f2c84a', chop: '#c8a070' })[c.op.k]; g.lineWidth = 4; g.beginPath(); g.arc(X, Y - TW * 1.9, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); }
    },
    over(g, G, sx, sy, TW) {
      if (!G.it) return;
      const me = G.me, W = cq.w, H = cq.h, now = performance.now() / 1000, MN = this.night(G), see = (x, y) => (MN ? MN.see(x, y) : lvl(x) === lvl(cq.x));
      const lit = (x, y) => { if (!MN) return lvl(x) === lvl(cq.x); if (!MN.lights) return true; return MN.lights.some(([lx, ly, r]) => Math.hypot(lx - x, ly - y) < r * 0.8) && lvl(x) === lvl(cq.x); };
      // squali nel mare
      if (!lvl(cq.x)) for (const s of MP().sharks) {
        const a = s.p + s.w * G.time, d = MP().R(a) + s.d, x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
        if (Math.abs(x - cq.x) > 14 || Math.abs(y - cq.y) > 14 || (MN && !lit(x, y))) continue;
        const X = sx(x, y), Y = sy(x, y), dir = s.w > 0 ? 1 : -1, sw = Math.sin(now * 3 + s.p) * 2;
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.ellipse(X - dir * 10, Y + 2, 16, 4, 0, 0, 7); g.stroke();
        g.fillStyle = '#4a5866'; g.beginPath(); g.moveTo(X - 9 * dir, Y); g.lineTo(X + 4 * dir + sw, Y - 20); g.lineTo(X + 9 * dir, Y); g.closePath(); g.fill();
      }
      // cartello ⛏️ sopra gli ingressi delle miniere (le rovine)
      if (!lvl(cq.x)) for (const m of MP().mouths) {
        const x = m.tx + 0.5, y = m.ty + 0.5; if (Math.abs(x - cq.x) > 14 || Math.abs(y - cq.y) > 14 || (MN && !lit(x, y))) continue;
        const X = sx(x, y), Y = sy(x, y) - TW * 1.1 + Math.sin(now * 3) * 2; g.fillStyle = 'rgba(20,16,10,.8)'; g.beginPath(); g.arc(X, Y, 12, 0, 7); g.fill();
        g.font = '14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⛏️', X, Y + 1);
      }
      // pedane premute (rovine)
      if (lvl(cq.x)) for (const H2 of MP().RZ.half) for (const pt of [H2.p1, ...H2.p2]) {
        if (!see(pt.x, pt.y)) continue;
        const on = active(G).some(c => { const q = P(c); return Math.floor(q.x) === Math.floor(pt.x) && Math.floor(q.y) === Math.floor(pt.y); });
        const fx = Math.floor(pt.x), fy = Math.floor(pt.y), Q = [[fx + 0.1, fy + 0.1], [fx + 0.9, fy + 0.1], [fx + 0.9, fy + 0.9], [fx + 0.1, fy + 0.9]].map(([a, b]) => [sx(a, b), sy(a, b)]);
        g.beginPath(); Q.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); if (on) { g.fillStyle = 'rgba(255,220,100,.45)'; g.fill(); } g.strokeStyle = on ? '#ffe070' : 'rgba(224,184,74,' + (0.55 + 0.3 * Math.sin(now * 3)) + ')'; g.lineWidth = 2; g.stroke();
      }
      // rovine: buio pieno fuori dalla stanza dove sono (stanza + pareti, bordi precisi). Entrando la luce si allarga da me (0,65 s).
      // Le parti dei personaggi della stanza che escono dal bordo (teste, cappelli) si ridisegnano sopra il buio
      if (lvl(cq.x) && me.alive) {
        const R = CQ_ROOMS[ruinRoom(G)];
        if (R) {
          const k0 = Math.min(1, (performance.now() - (G.rrT || 0)) / 650), k = 1 - Math.pow(1 - k0, 3), mx = sx(cq.x, cq.y), my = sy(cq.x, cq.y) - TW * 0.6;
          const x0 = R.x - 1, y0 = R.y - 1, x1 = R.x + R.w + 1, y1 = R.y + R.h + 1, up = TW * 0.575 * 1.42, sc = 0.1 + 0.9 * k;
          const pt = (x, y, u) => { const X = sx(x, y), Y = sy(x, y) - (u ? up : 0); return [mx + (X - mx) * sc, my + (Y - my) * sc]; };
          const L = [pt(x0, y1, 1), pt(x0, y0, 1), pt(x1, y0, 1), pt(x1, y0), pt(x1, y1), pt(x0, y1)], hole = () => { g.moveTo(...L[0]); for (const q of L.slice(1)) g.lineTo(...q); g.closePath(); };
          g.save(); g.beginPath(); g.rect(0, 0, W, H); hole(); g.fillStyle = '#050608'; g.fill('evenodd');
          if (k < 1) { g.beginPath(); hole(); g.fillStyle = 'rgba(5,6,8,' + (0.8 * (1 - k)) + ')'; g.fill(); }
          g.beginPath(); g.rect(0, 0, W, H); hole(); g.clip('evenodd');
          for (const c of G.chars) {
            if (c !== me && (!c.alive || this.hide(c) || (MN && !MN.see(c.x, c.y)))) continue;
            const q = P(c); if (c !== me && roomAt(q.x, q.y) !== G.rr) continue;
            cqPlayer(g, sx(q.x, q.y), sy(q.x, q.y), TW, cqLookOf(c), c === me ? cq.walk : c.walk, c === me ? cq.face : c.face);
          }
          g.restore();
        }
      }
      // pezzi a terra e in mano
      OB.draw(g, G, sx, sy, TW, (x, y) => lvl(x) ? lvl(cq.x) === 1 && !!MN && MN.see(x, y) : lit(x, y) || (!MN && lvl(x) === lvl(cq.x)), c => { if (c !== me && (this.hide(c) || (MN && !MN.see(c.x, c.y)))) return false; return lvl(P(c).x) === lvl(cq.x); });
      // spari
      for (const f of G.fx) { const k = 1 - (G.time - f[4]) / 0.5; if (k <= 0) continue; g.strokeStyle = 'rgba(255,230,140,' + k + ')'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx(f[0], f[1]), sy(f[0], f[1]) - TW * 0.8); g.lineTo(sx(f[2], f[3]), sy(f[2], f[3]) - TW * 0.8); g.stroke(); }
      // mappa del tesoro comprata: dove sono corde e vela
      if (G.mapT[me.t] > G.time) for (const it of G.it) if ((it.k === 'rope' || it.k === 'sail') && it.st === 0) SQ.edge(g, sx(it.x, it.y), sy(it.x, it.y) - TW, W, H, OB.KINDS[it.k].e, '#e0b84a');
      // zattera che salpa
      if (G.go) {
        const cp = MP().camps[G.go.t], k = Math.max(0, 1 - (G.go.at - G.time) / SAIL_T), x = cp.rx + 0.5 + Math.cos(cp.a) * k * 9, y = cp.ry + 0.5 + Math.sin(cp.a) * k * 9, X = sx(x, y), Y = sy(x, y) + Math.sin(now * 2) * 2, u = TW / 34;
        g.fillStyle = '#7a5232'; g.beginPath(); g.moveTo(X - 26 * u, Y); g.lineTo(X, Y - 13 * u); g.lineTo(X + 26 * u, Y); g.lineTo(X, Y + 13 * u); g.closePath(); g.fill();
        g.fillStyle = '#5a3e26'; g.fillRect(X - 1.5 * u, Y - 60 * u, 3 * u, 60 * u); g.fillStyle = '#efe6cf'; g.beginPath(); g.moveTo(X + 2 * u, Y - 58 * u); g.lineTo(X + 26 * u, Y - 12 * u); g.lineTo(X + 2 * u, Y - 12 * u); g.closePath(); g.fill();
        g.fillStyle = TEAMS[G.go.t].c; g.fillRect(X - 1.5 * u, Y - 66 * u, 14 * u, 8 * u);
      }
      // freccia: con un pezzo in mano verso la zattera (dalle rovine verso l'uscita)
      if (me.alive && me.t != null && held(G, me)) {
        let q = raftOf(G, me.t), ic = '⛵';
        if (lvl(cq.x)) { const e = MP().RZ.half[roomHalf({ x: cq.x })].exit; q = { x: e.x + 0.5, y: e.y + 0.5 }; ic = '🚪'; }
        SQ.edge(g, sx(q.x, q.y), sy(q.x, q.y) - TW, W, H, ic, TEAMS[me.t].c);
      }
      // alberi che cadono (0,7 s)
      const pn = performance.now();
      G.fall = G.fall.filter(f => pn - f.t0 < 700);
      for (const f of G.fall) { const k = (pn - f.t0) / 700, X = sx(f.x, f.y), Y = sy(f.x, f.y), a = k * k * 1.45, u = TW / 34; g.save(); g.translate(X, Y); g.rotate(a); g.globalAlpha = 1 - k * 0.6; g.fillStyle = '#7a5232'; g.fillRect(-5 * u, -70 * u, 10 * u, 70 * u); g.fillStyle = f.k === 'oak' ? '#4a8a3a' : '#3f8a3a'; g.beginPath(); g.ellipse(0, -72 * u, 26 * u, 20 * u, 0, 0, 7); g.fill(); g.restore(); g.globalAlpha = 1; }
      // pezzi che volano (consegna alla zattera, furto) e "+1" che sale
      G.flyFx = G.flyFx.filter(f => pn - f.t0 < 1500);
      for (const f of G.flyFx) {
        const k = Math.min(1, (pn - f.t0) / 550), x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k, X = sx(x, y), Y = sy(x, y) - TW * 1.2 - Math.sin(k * Math.PI) * TW * 1.6;
        if (k < 1) { g.save(); g.translate(X, Y); g.scale(1.1, 1.1); OB.KINDS[f.k].draw(g, 0, 0, TW, pn / 1000); g.restore(); }
        else { const q = (pn - f.t0 - 550) / 950, X1 = sx(f.x1, f.y1), Y1 = sy(f.x1, f.y1) - TW * 1.6 - q * TW; g.globalAlpha = 1 - q; g.font = '800 ' + Math.round(TW * (f.big ? 0.62 : 0.45)) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.6)'; const tx = (f.big ? '+1 ' : '') + OB.KINDS[f.k].e; g.strokeText(tx, X1, Y1); g.fillStyle = '#ffe070'; g.fillText(tx, X1, Y1); g.globalAlpha = 1; }
      }
      // fumetti sopra le zattere vicine: cosa c'e' sopra (su quella nemica, con 🎯, cosa ruberesti)
      if (!lvl(cq.x)) for (const t of [0, 1]) {
        const r = raftOf(G, t); if (Math.hypot(r.x - cq.x, r.y - cq.y) > 9 || (MN && !lit(r.x, r.y))) continue;
        const items = SHOW.map(k => OB.KINDS[k].e.repeat(Math.min(NEED[k], OB.count(G, t, k)))).join(''), tgt = ORDER.find(k => OB.count(G, t, k) > 0);
        const txt = (t !== me.t && tgt ? '🎯' + OB.KINDS[tgt].e + '  ' : '') + (items || 'vuota'), X = sx(r.x, r.y), Y = sy(r.x, r.y) - TW * 2.3;
        g.font = '600 13px system-ui,sans-serif'; const bw = g.measureText(txt).width + 18;
        g.fillStyle = t === me.t ? 'rgba(20,22,26,.6)' : 'rgba(90,20,20,.72)'; cqRR(g, X - bw / 2, Y - 13, bw, 26, 9); g.fill();
        g.beginPath(); g.moveTo(X - 6, Y + 13); g.lineTo(X + 6, Y + 13); g.lineTo(X, Y + 20); g.fill();
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, X, Y + 1);
      }
      // derubati: freccia rossa verso il ladro per qualche secondo
      if (G.thief && G.thief.until > G.time) { const th = byId(G, G.thief.id); if (th && th.alive && lvl(th.x) === lvl(cq.x)) { const q = P(th); SQ.edge(g, sx(q.x, q.y), sy(q.x, q.y) - TW, W, H, '🫳', '#e0402a'); g.strokeStyle = '#ff5040'; g.lineWidth = 3; g.beginPath(); g.ellipse(sx(q.x, q.y), sy(q.x, q.y), TW * 0.5, TW * 0.25, 0, 0, 7); g.stroke(); } }
      // "In mano": cosa sto portando e dove portarlo (in basso a sinistra, accanto al pulsante grande)
      const hh = me.alive && held(G, me);
      if (hh) {
        const K2 = OB.KINDS[hh.k], full = OB.count(G, me.t, hh.k) >= NEED[hh.k], sub = lvl(cq.x) ? '→ esci dalle scale 🪜' : full ? 'ne avete già abbastanza' : '→ portal' + (K2.a.startsWith('la ') ? 'a' : 'o') + ' alla zattera ⛵';
        const x0 = 12, y0 = H - 216, bw = Math.min(W - 130, 210), bh = 58;
        g.fillStyle = 'rgba(20,22,26,.72)'; cqRR(g, x0, y0, bw, bh, 12); g.fill();
        g.save(); g.translate(x0 + 30, y0 + 44); g.scale(1.25, 1.25); K2.draw(g, 0, 0, 34, pn / 1000 + Math.sin(pn / 300) * 0.2); g.restore();
        g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = '700 14px system-ui,sans-serif'; g.fillText('In mano: ' + K2.n, x0 + 62, y0 + 21);
        g.fillStyle = full ? '#ffb070' : '#bfe8a0'; g.font = '600 12px system-ui,sans-serif'; g.fillText(sub, x0 + 62, y0 + 40);
      }
    }
  };
  // albero da tagliare vicino a c (sull'isola, in piedi)
  function treeNear(G, c) {
    const q = P(c); if (lvl(q.x)) return -1; let b = -1, bd = 1.5;
    MP().trees.forEach((t, i) => { if (G.cut[i] || Math.abs(t.x + 0.5 - q.x) > 2 || Math.abs(t.y + 0.5 - q.y) > 2) return; const d = Math.hypot(t.x + 0.5 - q.x, t.y + 0.5 - q.y); if (d < bd) { bd = d; b = i; } });
    return b;
  }
  // alberi tagliati: ceppo al posto dell'albero, ricresce dopo REGROW s (su ogni telefono, da G.cut)
  function syncTrees(G) {
    MP().trees.forEach((t, i) => {
      const want = G.cut[i] ? 1 : 0; if ((t.cut ? 1 : 0) === want) return;
      t.cut = want; cqSolid[t.y][t.x] = want ? { prop: 'stump', o: { k: t.k === 'oak' ? 'oak' : 'pine' } } : { prop: 'tree', o: t };
      cqBgCell(t.x, t.y);
      if (want && G.time > 0.5 && Math.hypot(t.x - cq.x, t.y - cq.y) < 14) { G.fall.push({ x: t.x + 0.5, y: t.y + 0.5, k: t.k, t0: performance.now() }); thud(0.6, 120); }
    });
  }
  function finishOp(G, c) {
    const k = c.op.k, oi = c.op.i; c.op = null;
    if (k === 'chop') {
      if (G.cut[oi] || held(G, c)) return;
      const it = G.it.find(i => i.k === 'log' && i.st === 3) || G.it.filter(i => i.k === 'log' && i.st === 0).sort((a, b) => dxy(c, b.x, b.y) - dxy(c, a.x, a.y))[0];   // finiti quelli pronti: si riusa il tronco a terra piu' lontano
      if (!it) return;
      G.cut[oi] = G.time + REGROW; OB.grab(G, c, it); G.kn[c.t].add(it.id); say(G, 'chop', { a: c.id }); return;
    }
    if (k === 'chest') { if (!chestOk(G)) return; c.co = (c.co || 0) + CHEST_N; G.chest = G.time + CHEST_CD; say(G, 'chest', { a: c.id }); return; }
    const en = 1 - c.t; if (held(G, c) || !nearRaft(G, c, en)) return;
    const kk = ORDER.find(k2 => OB.count(G, en, k2) > 0); if (!kk) return;
    const it = G.it.find(i => i.st === 2 && i.b === en && i.k === kk); OB.grab(G, c, it); c.st = (c.st || 0) + 1;
    say(G, 'stolen', { a: c.id, b: en, i: kk, x: Math.round(raftOf(G, en).x * 10) / 10, y: Math.round(raftOf(G, en).y * 10) / 10 });
  }
});
