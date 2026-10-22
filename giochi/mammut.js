// Caccia al mammut (cooperativo). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Una tribu' nella prateria deve abbattere un mammut furbo e portare la carne al fuoco del campo prima che migri (dopo 2-4 notti).
// IL MAMMUT non ha percorsi fissi: ha BISOGNI (fame, sete, sonno) e sceglie ogni volta tra tanti posti (pascoli, acqua, posti riparati).
// Lascia TRACCE che dicono come sta (impronte che sbiadiscono, fangose dopo aver bevuto, sterco fumante, erba brucata, rami spezzati,
// buche per dormire calde, sangue quando e' ferito) e ogni tanto BARRISCE da lontano. Vede chi gli si avvicina e FIUTA chi arriva col VENTO alle spalle.
// Spaventato scappa e diventa sospettoso; ferito o affrontato da vicino CARICA (chi colpisce resta a terra). Di notte dorme nella sua buca.
// CACCIA: lance da lanciare e raccogliere, FOSSA scavata in due (ci cade dentro e resta bloccato), torce e urla che lo spingono via.
// SOPRAVVIVENZA: legna per il fuoco (di notte gli SCIACALLI attaccano chi e' fuori dalla luce e rubano dal campo se il fuoco e' basso),
// conigli da catturare: al tramonto ognuno ne mangia uno, chi resta senza il giorno dopo e' piu' lento.
// Chi viene colpito resta A TERRA 30 s: un compagno vicino lo rialza; se nessuno arriva diventa fantasma.
// Abbattuto il mammut, si macella: 6 pezzi di carne, uno a testa (pesanti), da portare al fuoco: ne bastano 4. Gli sciacalli li sentono.
CQ_WAIT.mammut = cqLib('mappe', 'indizi').then(L => {
  const MG = L.mappe, IZ = L.indizi;
  const N = 140;   // la mappa piu' grande finora (140x140)
  // giro di un giorno: giorno, tramonto, notte, alba (secondi)
  const DAY = 180, DUSK = 105, NIGHT = 120, DAWN = 170;
  const HOT0 = 50, HOT1 = 78;   // ore calde: riposa all'ombra
  const DOWN_T = 30, REV_T = 3, CHOP_T = 2, DIG_T = 8, BUTCH_T = 4, REGROW = 150, TRAP_T = 12, TORCH_T = 70, SHOUT_CD = 6;
  const THROW_R = 5.5, SPEARS = 2, SPEAR_MAX = 3, LOGS_MAX = 3, LOG_FUEL = 22, MEAT_N = 6, MEAT_NEED = 4, RAB_MAX = 2;
  const VIS_D = 6.5, VIS_N = 4, VIS_S = 2.2, SMELL = 12, PUSH_R = 4, SHOUT_R = 7, CH_R = 2.8;
  const SEE_N = 3.0, TORCH_L = 5.2, HEAR_T = 48;   // HEAR_T: fin dove si sente un barrito   // fin dove si vede di notte: da soli, con la torcia
  const LOOK_T = 3, SPY_T = 7, SPY_CD = 120;   // vedetta del cerchio di pietre: 3 s a guardare, il mammut sulla mappa per 7 s, poi 120 s di riposo
  // CACCIA VERA (giro 5, 20-10-2026): di giorno c'e' foschia e il mammut si vede solo da vicino (VIEW_D); le lance lo feriscono ma non lo abbattono
  // (non scende sotto FLOOR della vita): per finirlo serve la FOSSA o CIRCONDARLO (bloccato contro acqua, rocce o cacciatori: STUCK_T s fermo)
  const VIEW_D = 8.5, HAZE0 = 6.2, STUCK_T = 7, FLOOR_K = 0.4;
  // NOTTE DURA: il fuoco tiene poco (FUEL_MAX) e di notte brucia tanto; gli sciacalli entrano nella luce e attaccano chi non e' vicino alle fiamme
  const FUEL_MAX = 70, BURN_D = 0.35, BURN_N = 2.0;   // la legna in piu' resta in mano (scorta per la notte)
  const mmss = t => Math.floor(Math.max(0, t) / 60) + ':' + String(Math.floor(Math.max(0, t) % 60)).padStart(2, '0');
  const MP = () => CQ_MAP;
  const P = c => cqModePos(c);
  const dxy = (c, x, y) => { const p = P(c); return Math.hypot(p.x - x, p.y - y); };
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const downed = c => !!c.dn;
  const active = G => G.chars.filter(c => c.alive && !c.dn);
  const cyc = G => ((G.time % DAY) + DAY) % DAY;
  const dayN = G => Math.floor(Math.max(0, G.time) / DAY) + 1;
  const dark = G => { const t = cyc(G); return t < DUSK ? 0 : t < NIGHT ? (t - DUSK) / (NIGHT - DUSK) : t < DAWN ? 1 : 1 - (t - DAWN) / (DAY - DAWN); };
  const isNight = G => { const t = cyc(G); return t >= NIGHT - 4 && t < DAWN + 3; };
  const NN = G => G.opt.nights || 2;
  const endT = G => (NN(G) - 1) * DAY + DAWN;
  const fireC = () => ({ x: MP().camp.x + 0.5, y: MP().camp.y + 0.5 });
  const fireR = G => G.fuel > 0 ? 3.2 + 2.8 * Math.min(1, G.fuel / 60) : 0;
  const inFire = (G, x, y) => G.fuel > 0 && Math.hypot(x - fireC().x, y - fireC().y) < fireR(G) * 0.92;
  // vicino alle fiamme (li' gli sciacalli non osano): una parte della luce, piu' piccola quando il fuoco e' basso
  const coreR = G => G.fuel > 0 ? fireR(G) * (G.fuel < 20 ? 0.45 : 0.56) : 0;
  const inCore = (G, x, y) => G.fuel > 0 && Math.hypot(x - fireC().x, y - fireC().y) < coreR(G);
  // fin dove si vede il mammut di giorno (foschia); al tramonto e di notte valgono le luci
  const viewD = G => VIEW_D;
  const mmShown = (G, x, y) => { const m = G.mm; return !!m && (dark(G) >= 0.5 || Math.hypot(m.x - x, m.y - y) < viewD(G)); };
  const atCamp = (x, y, r = 3) => Math.hypot(x - fireC().x, y - fireC().y) < r;
  const torchOn = (G, c) => (c.tor || 0) > G.time;
  const ARW = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
  const arrowOf = (dx, dy) => { const sx = dx - dy, sy = (dx + dy) / 2; return ARW[(Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) + 8) % 8]; };
  const thud = (v, f) => { try { beep(f || 160, 0.08, 0.03 * (v || 1)); } catch {} };
  const nm = (G, c) => c === G.me ? 'Tu' : c.name;
  // ---- LUOGHI SPECIALI ----
  // radura delle lucciole (rifugio di notte, abbeveratoio preferito), cerchio di menhir (vedetta), riparo dipinto (le abitudini del mammut),
  // dolmen (rifugio), cimitero dei mammut (lui ci gira alla larga), cascatella, albero millenario (ombra preferita), sorgente calda (rifugio), canneto (nascosti ma rumorosi)
  const LMS = { glade: ['✨', 'Radura delle lucciole', 'Di notte le lucciole fanno luce: gli sciacalli non entrano. Il mammut ci viene a bere, ogni tanto.', 7.2],
    menhir: ['🗿', 'Cerchio di pietre', 'Dal centro, in cima alla collina, si guarda lontano: per qualche secondo vedrete il mammut sulla mappa.', 4.3],
    paint: ['🎨', 'Riparo dipinto', 'Le pitture degli antichi cacciatori raccontano le abitudini di questo mammut.', 5],
    dolmen: ['🪨', 'Dolmen', 'Sotto la grande pietra gli sciacalli non ti prendono.', 2.8],
    cem: ['🦴', 'Cimitero dei mammut', 'I mammut girano alla larga da questo posto.', 7],
    fall: ['💦', 'Cascatella', '', 3.5],
    gtree: ['🌳', 'Albero millenario', 'Ombra fresca: il mammut ci riposa volentieri nelle ore calde.', 4.2],
    spring: ['♨️', 'Sorgente calda', 'Il calore e il vapore tengono lontani gli sciacalli di notte.', 3.8],
    marsh: ['🎋', 'Canneto', 'Tra le canne il mammut non ti vede, ma se cammini frusciano.', 5.8] };
  const LM = () => MP().lm || {};
  const terAt = (x, y) => { const r = MP().ter[Math.floor(y)]; return r ? r[Math.floor(x)] : 0; };
  const inMarsh = (x, y) => terAt(x, y) === 9;
  const lmAt = (x, y) => { const L = LM(); for (const k in LMS) { const o = L[k]; if (o && Math.hypot(x - o.x, y - o.y) < LMS[k][3]) return k; } return null; };
  // rifugi: li' gli sciacalli non entrano (cerchi [x, y, raggio])
  const refC = () => { const L = LM(), out = []; if (L.glade) out.push([L.glade.x, L.glade.y, 5.4, 'glade']); if (L.spring) out.push([L.spring.x, L.spring.y, 3.1, 'spring']); if (L.dolmen) out.push([L.dolmen.x, L.dolmen.y, 1.05, 'dolmen']); return out; };
  const refuge = (x, y) => { for (const r of refC()) if (Math.hypot(x - r[0], y - r[1]) < r[2]) return r[3]; return null; };
  const safe = (G, x, y) => inCore(G, x, y) || !!refuge(x, y);

  // ======================= MAPPA: la prateria (col seme) =======================
  // ter[y][x]: 1 prato, 2 pascolo (erba alta, il mammut ci mangia), 3 sottobosco, 4 fango (riva), 5 guado (acqua bassa), 6 acqua, 7 campo
  function mapPrateria(seed) { let M = null; for (let k = 0; k < 10 && !(M && M.ok); k++) M = build((seed | 0) * 13 + k); return M; }
  function build(seed) {
    const rnd = MG.rnd(seed), W = N, H = N;
    const ter = [], hz = []; for (let y = 0; y < H; y++) { ter.push(new Uint8Array(W).fill(1)); hz.push(new Uint8Array(W)); }
    const inside = (x, y, m = 0) => x >= m && y >= m && x < W - m && y < H - m;
    const camp = { x: Math.floor(W / 2 + (rnd() - 0.5) * 30), y: Math.floor(H / 2 + (rnd() - 0.5) * 30) };
    const dC = (x, y) => Math.hypot(x - camp.x, y - camp.y);
    // ---- fiume che serpeggia da bordo a bordo, lontano dal campo; tre guadi ----
    const vert = rnd() < 0.5, side = rnd() < 0.5 ? -1 : 1, cc = vert ? camp.x : camp.y;
    let base = cc + side * (22 + Math.floor(rnd() * 12)); if (base < 12 || base > N - 13) base = cc - side * (22 + Math.floor(rnd() * 12));
    base = Math.max(12, Math.min(N - 13, base));
    const ph1 = rnd() * 7, ph2 = rnd() * 7, A1 = 4 + rnd() * 4, A2 = 1.5 + rnd() * 2;
    const riv = [];
    for (let v = 0; v < N; v++) { const u = Math.round(base + A1 * Math.sin(v * 0.08 + ph1) + A2 * Math.sin(v * 0.27 + ph2)), w = 2 + (Math.sin(v * 0.2 + ph2) > 0.6 ? 1 : 0); riv.push([u, w]); }
    const setT = (x, y, t) => { if (inside(x, y)) ter[y][x] = t; };
    riv.forEach(([u, w], v) => { for (let i = 0; i < w; i++) vert ? setT(u + i, v, 6) : setT(v, u + i, 6); });
    riv.forEach(([u, w], v) => { for (const i of [-1, w]) { const x = vert ? u + i : v, y = vert ? v : u + i; if (inside(x, y) && ter[y][x] !== 6) ter[y][x] = 4; } });
    const fords = []; for (const f of [0.14, 0.38, 0.62, 0.86]) { const v = Math.floor(N * f + (rnd() - 0.5) * 8); fords.push(v); for (const vv of [v, v + 1]) { const [u, w] = riv[vv]; for (let i = -1; i <= w; i++) { const x = vert ? u + i : vv, y = vert ? vv : u + i; if (inside(x, y)) ter[y][x] = i < 0 || i >= w ? 4 : 5; } } }
    // ---- stagni ----
    const ponds = [];
    for (let i = 0; i < 600 && ponds.length < 6; i++) {
      const x = 8 + Math.floor(rnd() * (N - 16)), y = 8 + Math.floor(rnd() * (N - 16)), r = 1.6 + rnd() * 1.1;
      if (dC(x, y) < 14 || ponds.some(p => Math.hypot(p.x - x, p.y - y) < 22)) continue;
      let near = false; for (let yy = y - 6; yy <= y + 6 && !near; yy++) for (let xx = x - 6; xx <= x + 6; xx++) if (inside(xx, yy) && ter[yy][xx] >= 4) { near = true; break; }
      if (near) continue;
      const wb = MG.wobble(rnd, 2, 0.18);
      for (let yy = y - 5; yy <= y + 5; yy++) for (let xx = x - 5; xx <= x + 5; xx++) { if (!inside(xx, yy, 1)) continue; const d = Math.hypot(xx - x, yy - y) / wb(Math.atan2(yy - y, xx - x)); if (d < r) ter[yy][xx] = 6; else if (d < r + 1.2 && ter[yy][xx] !== 6) ter[yy][xx] = 4; }
      ponds.push({ x: x + 0.5, y: y + 0.5 });
    }
    // ---- colline leggere (al massimo 2 gradini) ----
    const hills = [];
    for (let i = 0; i < 400 && hills.length < 8; i++) {
      const x = 6 + Math.floor(rnd() * (N - 12)), y = 6 + Math.floor(rnd() * (N - 12)), R = 5 + rnd() * 4;
      if (dC(x, y) < 11 + R || hills.some(h => Math.hypot(h.x - x, h.y - y) < 20)) continue;
      hills.push({ x, y, R });
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) { const d = Math.hypot(xx - x, yy - y); if (d > R * 1.7) continue; const L2 = Math.round(2.4 * Math.exp(-Math.pow(d / R, 2)) - 0.25); if (L2 > hz[yy][xx]) hz[yy][xx] = L2; }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ter[y][x] >= 4) hz[y][x] = 0;
    for (let k = 0; k < 3; k++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 9; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inside(x + dx, y + dy)) m = Math.min(m, hz[y + dy][x + dx]); if (hz[y][x] > m + 1) hz[y][x] = m + 1; }
    // ---- LUOGHI SPECIALI: riferimenti per orientarsi, ognuno con un ruolo nella caccia (vedi "LUOGHI SPECIALI" piu' sotto) ----
    // ter: 8 radura, 9 canneto, 10 cimitero, 11 pietra calda, 12 terra d'ocra, 13 acqua calda, 14 schiuma della cascata
    const lm = {}, res = [], resv = (x, y, pad) => res.some(r => Math.hypot(r.x - x, r.y - y) < r.r + pad);
    const nearWater = (x, y, r) => { for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) if (inside(xx, yy) && ter[yy][xx] >= 4 && ter[yy][xx] <= 6) return true; return false; };
    const flatAt = (x, y, r) => { for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) if (!inside(xx, yy, 3) || hz[yy][xx] || ter[yy][xx] !== 1) return false; return true; };
    const pick = (tries, lo, hi, fn) => { for (let i = 0; i < tries; i++) { const x = 8 + Math.floor(rnd() * (N - 16)), y = 8 + Math.floor(rnd() * (N - 16)), d = dC(x, y); if (d < lo || d > hi) continue; const o = fn(x, y); if (o) { res.push(o); return o; } } return null; };
    const disc = (cx, cy, R, fn, amp = 0.14) => { const wb = MG.wobble(rnd, 3, amp); for (let yy = Math.floor(cy - R - 2); yy <= cy + R + 2; yy++) for (let xx = Math.floor(cx - R - 2); xx <= cx + R + 2; xx++) { if (!inside(xx, yy, 1)) continue; const d = Math.hypot(xx + 0.5 - cx, yy + 0.5 - cy) / wb(Math.atan2(yy + 0.5 - cy, xx + 0.5 - cx)); fn(xx, yy, d); } };
    // cascatella: un gradino di roccia sul fiume (lontano dai guadi)
    for (let i = 0; i < 200 && !lm.fall; i++) {
      const v = 12 + Math.floor(rnd() * (N - 26)); if (fords.some(f => Math.abs(f - v) < 7)) continue;
      const [u, w] = riv[v], x = vert ? u + w / 2 : v + 0.5, y = vert ? v + 0.5 : u + w / 2; if (dC(x, y) < 22) continue;
      lm.fall = { x, y, r: 3, v }; res.push(lm.fall);
      const [u1, w1] = riv[v + 1]; for (let k = 0; k < w1; k++) { const xx = vert ? u1 + k : v + 1, yy = vert ? v + 1 : u1 + k; if (ter[yy][xx] === 6) ter[yy][xx] = 14; }
    }
    // canneto: canne alte lungo il fiume (ci si nasconde, ma camminando frusciano)
    for (let i = 0; i < 300 && !lm.marsh; i++) {
      const v = 10 + Math.floor(rnd() * (N - 20)); if (fords.some(f => Math.abs(f - v) < 6)) continue;
      const [u, w] = riv[v], o = rnd() < 0.5 ? -4 : w + 3, x = vert ? u + o : v, y = vert ? v : u + o;
      if (!inside(x, y, 8) || dC(x, y) < 18 || resv(x, y, 9)) continue;
      lm.marsh = { x: x + 0.5, y: y + 0.5, r: 5.5 }; res.push(lm.marsh);
      disc(x + 0.5, y + 0.5, 5.6, (xx, yy, d) => { if (d < 5.6 && (ter[yy][xx] === 1 || ter[yy][xx] === 4) && !hz[yy][xx]) ter[yy][xx] = 9; }, 0.25);
    }
    // radura delle lucciole: stagno con le ninfee e i salici, erba fitta e fiori
    lm.glade = pick(1500, 24, 60, (x, y) => !resv(x, y, 16) && !nearWater(x, y, 11) && flatAt(x, y, 6) ? { x: x + 0.5, y: y + 0.5, r: 7 } : null);
    if (lm.glade) disc(lm.glade.x, lm.glade.y, 7.2, (xx, yy, d) => { if (d < 2.4) ter[yy][xx] = 6; else if (d < 7.2 && ter[yy][xx] === 1) ter[yy][xx] = 8; }, 0.12);
    // cerchio di menhir in cima a una collina (vedetta)
    const hl = hills.filter(h => { const d = dC(h.x, h.y); return d > 22 && d < 64 && inside(h.x, h.y, 10) && hz[h.y][h.x] >= 1 && !resv(h.x, h.y, 12); });
    if (hl.length) {
      const h = hl[Math.floor(rnd() * hl.length)], z = hz[h.y][h.x]; lm.menhir = { x: h.x + 0.5, y: h.y + 0.5, r: 4.2 }; res.push(lm.menhir);
      for (let yy = h.y - 5; yy <= h.y + 5; yy++) for (let xx = h.x - 5; xx <= h.x + 5; xx++) if (inside(xx, yy) && Math.hypot(xx - h.x, yy - h.y) < 4.2 && ter[yy][xx] < 4) { hz[yy][xx] = z; ter[yy][xx] = 1; }
    }
    // riparo con le pitture rupestri: una parete di roccia (le pitture sulla faccia che si vede) e la terra d'ocra davanti
    lm.paint = pick(1500, 22, 64, (x, y) => {
      if (resv(x + 3, y + 1, 12) || nearWater(x + 3, y + 1, 5)) return null;
      for (let yy = y - 2; yy <= y + 4; yy++) for (let xx = x - 1; xx <= x + 7; xx++) if (!inside(xx, yy, 3) || hz[yy][xx] || ter[yy][xx] !== 1) return null;
      return { x: x + 3.5, y: y + 2, r: 5, x0: x, y0: y };
    });
    if (lm.paint) { const { x0, y0 } = lm.paint; for (let yy = y0 + 1; yy <= y0 + 3; yy++) for (let xx = x0 - 1; xx <= x0 + 7; xx++) if (Math.abs(xx - x0 - 3) + (yy - y0 - 1) * 1.6 < 6) ter[yy][xx] = 12; }
    // cimitero dei mammut: ossa e zanne giganti nell'erba secca (i mammut ci girano alla larga)
    lm.cem = pick(1500, 26, 66, (x, y) => !resv(x, y, 14) && !nearWater(x, y, 6) && flatAt(x, y, 5) ? { x: x + 0.5, y: y + 0.5, r: 6.5 } : null);
    if (lm.cem) disc(lm.cem.x, lm.cem.y, 6.5, (xx, yy, d) => { if (d < 6.5 && ter[yy][xx] === 1) ter[yy][xx] = 10; }, 0.2);
    // albero millenario (2x2), sorgente calda, dolmen
    lm.gtree = pick(1500, 16, 56, (x, y) => !resv(x, y, 12) && !nearWater(x, y, 4) && flatAt(x, y, 4) ? { x: x + 1, y: y + 1, r: 4, cx: x, cy: y } : null);
    lm.spring = pick(1500, 24, 66, (x, y) => !resv(x, y, 14) && !nearWater(x, y, 6) && flatAt(x, y, 4) ? { x: x + 1, y: y + 1, r: 3.6, cx: x, cy: y } : null);
    if (lm.spring) { const { cx, cy } = lm.spring; disc(cx + 1, cy + 1, 3.6, (xx, yy, d) => { if (d < 3.6 && ter[yy][xx] === 1) ter[yy][xx] = 11; }, 0.15); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) ter[cy + dy][cx + dx] = 13; }
    lm.dolmen = pick(1500, 20, 62, (x, y) => !resv(x, y, 12) && !nearWater(x, y, 4) && flatAt(x, y, 3) ? { x: x + 0.5, y: y + 0.5, r: 2.6 } : null);
    // ---- pascoli (erba alta) e boschetti ----
    const meadows = [], groves = [];
    for (let i = 0; i < 900 && meadows.length < 16; i++) {
      const x = 5 + Math.floor(rnd() * (N - 10)), y = 5 + Math.floor(rnd() * (N - 10)), r = 3.5 + rnd() * 2.5;
      if (dC(x, y) < 10 || ter[y][x] !== 1 || meadows.some(m => Math.hypot(m.x - x, m.y - y) < 15) || resv(x, y, r + 2)) continue;
      const wb = MG.wobble(rnd, 3, 0.2); meadows.push({ x, y, r });
      for (let yy = y - 8; yy <= y + 8; yy++) for (let xx = x - 8; xx <= x + 8; xx++) if (inside(xx, yy) && ter[yy][xx] === 1 && Math.hypot(xx - x, yy - y) < r * wb(Math.atan2(yy - y, xx - x))) ter[yy][xx] = 2;
    }
    for (let i = 0; i < 900 && groves.length < 13; i++) {
      const x = 5 + Math.floor(rnd() * (N - 10)), y = 5 + Math.floor(rnd() * (N - 10)), r = 3.5 + rnd() * 3;
      if (dC(x, y) < 9 || ter[y][x] !== 1 || groves.some(m => Math.hypot(m.x - x, m.y - y) < 14) || meadows.some(m => Math.hypot(m.x - x, m.y - y) < 10) || resv(x, y, r + 3)) continue;
      const wb = MG.wobble(rnd, 3, 0.22); groves.push({ x, y, r });
      for (let yy = y - 9; yy <= y + 9; yy++) for (let xx = x - 9; xx <= x + 9; xx++) if (inside(xx, yy) && ter[yy][xx] === 1 && Math.hypot(xx - x, yy - y) < r * wb(Math.atan2(yy - y, xx - x))) ter[yy][xx] = 3;
    }
    // ---- campo: terra battuta, fuoco al centro ----
    for (let y = camp.y - 5; y <= camp.y + 5; y++) for (let x = camp.x - 5; x <= camp.x + 5; x++) if (inside(x, y) && Math.hypot(x - camp.x, y - camp.y) < 4.6) { ter[y][x] = 7; hz[y][x] = 0; }
    for (let k = 0; k < 3; k++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 9; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inside(x + dx, y + dy)) m = Math.min(m, hz[y + dy][x + dx]); if (hz[y][x] > m + 1) hz[y][x] = m + 1; }
    const props = [], taken = new Set(), K = (x, y) => x + ',' + y, pp = (t, x, y, o) => { props.push([t, x, y, o]); taken.add(K(x, y)); };
    const free = (x, y) => inside(x, y) && ter[y][x] !== 6 && !taken.has(K(x, y));
    const step = (ax, ay, bx, by) => Math.abs(hz[by][bx] - hz[ay][ax]) <= 1;
    const fallC = new Set(); if (lm.fall) { const [u, w] = riv[lm.fall.v]; for (let k = 0; k < w; k++) fallC.add(vert ? K(u + k, lm.fall.v) : K(lm.fall.v, u + k)); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ter[y][x] === 6 || ter[y][x] >= 13) { if (fallC.has(K(x, y))) pp('fall', x, y, { vert }); else pp('wat', x, y); }
    // bordo: macchia fitta di rovi (non si passa)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && !taken.has(K(x, y))) pp('thick', x, y);
    const C2 = camp;
    pp('mfire', C2.x, C2.y);
    const campP = [['hide', -3, -2, 0], ['hide', 2, -3, 1], ['hide', -3, 2, 2], ['sprack', 3, 1], ['mdry', 1, 3], ['skull', -1, -4], ['stash', 3, -1]];
    for (const [t, dx, dy, v] of campP) pp(t, C2.x + dx, C2.y + dy, { v });
    // ---- oggetti dei luoghi speciali ----
    const front = a => Math.cos(a) + Math.sin(a) > 0.75;   // dalla parte di chi guarda: oggetti bassi, se no coprono il centro
    if (lm.fall) { const v = lm.fall.v; for (const vv of [v - 1, v, v + 1]) { const [u, w] = riv[vv]; for (const i of [-1, w, -2, w + 1]) { const x = vert ? u + i : vv, y = vert ? vv : u + i; if (free(x, y) && (ter[y][x] === 4 || ter[y][x] === 1) && (Math.abs(i - w / 2) < w / 2 + 1.6 || vv === v)) pp('wrock', x, y, { v: (x * 7 + y) % 3 }); } } }
    if (lm.glade) { const { x: gx, y: gy } = lm.glade; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + 0.3; if (front(a)) continue; const r = 4.3 + (k % 2) * 0.9, x = Math.floor(gx + Math.cos(a) * r), y = Math.floor(gy + Math.sin(a) * r); if (free(x, y) && ter[y][x] === 8) pp('willow', x, y, { v: k % 3 }); } }
    if (lm.menhir) { const { x: mx0, y: my0 } = lm.menhir; for (let k = 0; k < 9; k++) { if (k === 2 || k === 6) continue; const a = k / 9 * Math.PI * 2 + 0.2, x = Math.floor(mx0 + Math.cos(a) * 3.1), y = Math.floor(my0 + Math.sin(a) * 3.1); if (free(x, y)) pp('menhir', x, y, { v: k, low: front(a) ? 1 : 0 }); } }
    if (lm.paint) { const { x0, y0 } = lm.paint; for (let i = 0; i < 7; i++) { pp('pwall', x0 + i, y0, { i }); if (i % 3 !== 1 && free(x0 + i, y0 - 1)) pp('boulder', x0 + i, y0 - 1); } }
    if (lm.dolmen) { const x = Math.floor(lm.dolmen.x), y = Math.floor(lm.dolmen.y); for (const [dx, dy, s2] of [[-1, -1, 'bl'], [0, -1, 'bk'], [1, -1, 'br'], [-1, 0, 'fl'], [1, 0, 'fr']]) pp('dolm', x + dx, y + dy, { s: s2 }); }
    if (lm.cem) { const { x: ex, y: ey } = lm.cem, nb = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => taken.has(K(x + dx, y + dy)));
      for (const [t, n] of [['tusks', 4], ['mskull', 2], ['ribs', 3]]) for (let i = 0, k = 0; i < 120 && k < n; i++) { const a = rnd() * 7, r = 1 + rnd() * 4.5, x = Math.floor(ex + Math.cos(a) * r), y = Math.floor(ey + Math.sin(a) * r); if (free(x, y) && ter[y][x] === 10 && !nb(x, y)) { pp(t, x, y, { v: Math.floor(rnd() * 3) }); k++; } } }
    if (lm.gtree) { const { cx, cy } = lm.gtree; pp('gtree', cx, cy, { part: 1 }); pp('gtree', cx + 1, cy, { part: 1 }); pp('gtree', cx, cy + 1, { part: 1 }); pp('gtree', cx + 1, cy + 1, { main: 1 }); }
    if (lm.spring) { const { x: qx, y: qy } = lm.spring; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + 0.5; if (front(a)) continue; const x = Math.floor(qx + Math.cos(a) * 2.2 - 0.0001), y = Math.floor(qy + Math.sin(a) * 2.2 - 0.0001); if (free(x, y) && ter[y][x] === 11) pp('srock', x, y, { v: k % 3 }); } }
    // ---- alberi (boschetti fitti, qualcuno isolato nella prateria), rocce, cespugli ----
    const decals = [], deco = [], trees = [];
    const nearT = (x, y, r) => trees.some(t => Math.abs(t.x - x) < r && Math.abs(t.y - y) < r && Math.hypot(t.x - x, t.y - y) < r);
    const tree = (x, y, k) => { const o = { x, y, k, v: Math.floor(rnd() * 3), h: 1.22 + rnd() * 0.22, a: 1 }; trees.push(o); pp('tree', x, y, o); };
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      if (!free(x, y) || dC(x, y) < 6) continue;
      const t = ter[y][x], r = rnd();
      if (t === 8) { if (r < 0.3) deco.push([x, y, 'flower']); else if (r < 0.34) deco.push([x, y, 'mush']); else if (r < 0.5) deco.push([x, y, 'tuft']); continue; }
      if (t === 9) { if (r < 0.62) deco.push([x, y, 'reedT']); else if (r < 0.7) deco.push([x, y, 'puddle']); continue; }
      if (t === 10) { if (r < 0.13) deco.push([x, y, 'bones']); else if (r < 0.42) deco.push([x, y, 'dtuft']); continue; }
      if (t === 11 || t === 12) { if (r < 0.16) deco.push([x, y, 'pebble']); continue; }
      if (t === 1 && resv(x, y, 0.5)) { if (r < 0.05) deco.push([x, y, 'flower']); else if (r < 0.14) deco.push([x, y, 'tuft']); continue; }
      if (t === 3) { if (r < 0.17 && !nearT(x, y, 2.6)) { tree(x, y, rnd() < 0.7 ? 'oak' : 'pine'); continue; } if (r < 0.36) deco.push([x, y, 'fern']); else if (r < 0.45) deco.push([x, y, 'mush']); continue; }
      if (t === 1) { if (r < 0.0035 && !nearT(x, y, 8)) { tree(x, y, 'oak'); continue; } if (r < 0.06) deco.push([x, y, 'flower']); else if (r < 0.2) deco.push([x, y, 'tuft']); else if (r < 0.215) deco.push([x, y, 'pebble']); continue; }
      if (t === 2) { if (r < 0.55) deco.push([x, y, 'tgrass']); else if (r < 0.62) deco.push([x, y, 'flower']); continue; }
      if (t === 4) { if (r < 0.28) deco.push([x, y, 'reed']); continue; }
    }
    // rocce: gruppi di massi (posti riparati per dormire, anche per il mammut)
    const rocks = [];
    for (let i = 0; i < 600 && rocks.length < 11; i++) {
      const x = 4 + Math.floor(rnd() * (N - 8)), y = 4 + Math.floor(rnd() * (N - 8));
      if (dC(x, y) < 10 || ter[y][x] !== 1 || rocks.some(r => Math.hypot(r.x - x, r.y - y) < 16) || resv(x, y, 3)) continue;
      const cells = [[0, 0], [1, 0], [0, 1], [2, 1], [1, 2], [-1, 1]].filter(() => rnd() < 0.75);
      if (cells.length < 2 || !cells.every(([dx, dy]) => free(x + dx, y + dy) && ter[y + dy][x + dx] === 1)) continue;
      cells.forEach(([dx, dy]) => pp('boulder', x + dx, y + dy)); rocks.push({ x, y });
    }
    // tane dei conigli
    const burrows = [];
    for (let i = 0; i < 900 && burrows.length < 16; i++) {
      const x = 3 + Math.floor(rnd() * (N - 6)), y = 3 + Math.floor(rnd() * (N - 6));
      if (!free(x, y) || dC(x, y) < 8 || (ter[y][x] !== 1 && ter[y][x] !== 2) || burrows.some(b => Math.hypot(b.x - x, b.y - y) < 10) || resv(x, y, 1)) continue;
      burrows.push({ x: x + 0.5, y: y + 0.5 }); deco.push([x, y, 'burrow']);
    }
    // ---- raggiungibile dal campo (un gradino alla volta) ----
    const nf = (x, y) => { for (const [dx, dy] of [[0, 2], [2, 0], [1, 1], [-2, 0], [0, -2]]) if (free(x + dx, y + dy)) return [x + dx, y + dy]; return [x, y + 2]; };
    const seen = MG.flood(W, H, free, ...nf(C2.x, C2.y), step), ok = (x, y) => inside(x, y) && !!seen[y * W + x];
    // posti del mammut: dove mangia (pascoli), beve (riva o guado accanto all'acqua), dorme (bordo dei boschetti, tra le rocce)
    const eat = meadows.map(m => [Math.floor(m.x), Math.floor(m.y)]).filter(([x, y]) => ok(x, y));
    const wetN = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx, y + dy) && (ter[y + dy][x + dx] === 5 || ter[y + dy][x + dx] === 6));
    const drink = MG.scatter(rnd, 15, 5000, r => { const x = 2 + Math.floor(r() * (N - 4)), y = 2 + Math.floor(r() * (N - 4)); return free(x, y) && ok(x, y) && (ter[y][x] === 4 || ter[y][x] === 5) && wetN(x, y) && dC(x, y) > 9 ? [x, y] : null; }, 11);
    const sleep = MG.scatter(rnd, 12, 6000, r => {
      const x = 3 + Math.floor(r() * (N - 6)), y = 3 + Math.floor(r() * (N - 6)); if (!free(x, y) || !ok(x, y) || dC(x, y) < 12 || ter[y][x] > 3) return null;
      let tr = 0; for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) { const o = taken.has(K(xx, yy)) && props.find(p => p[1] === xx && p[2] === yy); if (o && (o[0] === 'tree' || o[0] === 'boulder')) tr++; }
      return tr >= 2 ? [x, y] : null;
    }, 12);
    // i luoghi speciali nei posti del mammut: la radura (ci beve volentieri), l'albero millenario (ombra e sonno); dal cimitero sta alla larga
    const nCem = ([x, y]) => !lm.cem || Math.hypot(x + 0.5 - lm.cem.x, y + 0.5 - lm.cem.y) > 11;
    for (const L2 of [eat, drink, sleep]) for (let i = L2.length - 1; i >= 0; i--) if (!nCem(L2[i])) L2.splice(i, 1);
    const n0 = drink.length;
    if (lm.glade) { const gl = []; disc(lm.glade.x, lm.glade.y, 4, (xx, yy, d) => { if (ter[yy][xx] === 8 && free(xx, yy) && ok(xx, yy) && wetN(xx, yy) && !gl.some(([a, b]) => Math.hypot(a - xx, b - yy) < 2.5)) gl.push([xx, yy]); }, 0); gl.slice(0, 3).forEach(p => drink.push(p)); lm.glade.sp = gl.slice(0, 3); }
    if (lm.gtree) { const { cx, cy } = lm.gtree; for (const [dx, dy] of [[2, 2], [1, 2], [2, 1], [0, 2], [2, 0], [-1, 1], [1, -1]]) if (free(cx + dx, cy + dy) && ok(cx + dx, cy + dy)) { lm.gtree.sp = [cx + dx, cy + dy]; sleep.push(lm.gtree.sp); break; } }
    const s0 = sleep.length - (lm.gtree && lm.gtree.sp ? 1 : 0);
    // le abitudini di QUESTO mammut (le raccontano le pitture): pascolo preferito, dove beve (-1 = la radura), dove riposa (-1 = l'albero millenario)
    const fav = { eat: Math.floor(rnd() * Math.max(1, eat.length)), drink: lm.glade && lm.glade.sp.length && rnd() < 0.65 ? -1 : Math.floor(rnd() * Math.max(1, n0)), sleep: lm.gtree && lm.gtree.sp && rnd() < 0.6 ? -1 : Math.floor(rnd() * Math.max(1, s0)) };
    for (const k in lm) { const o = lm[k]; if (o && !ok(Math.floor(o.x), Math.floor(o.y)) && k !== 'fall' && k !== 'gtree' && k !== 'spring' && k !== 'glade') { const c = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1]].map(([dx, dy]) => [Math.floor(o.x) + dx, Math.floor(o.y) + dy]).find(([x, y]) => ok(x, y)); if (!c) lm[k] = null; } }
    const okAll = !!(lm.glade && lm.paint && lm.menhir) && eat.length >= 4 && drink.length >= 4 && sleep.length >= 3 && burrows.filter(b => ok(Math.floor(b.x), Math.floor(b.y))).length >= 4 && trees.length >= 50;
    const deco2 = deco.filter(([x, y]) => !taken.has(K(x, y)));
    const ring = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = Math.round(C2.x + Math.cos(a) * 2.2), y = Math.round(C2.y + Math.sin(a) * 2.2); if (free(x, y) && !ring.some(r => r[0] === x && r[1] === y)) ring.push([x, y]); }
    const rooms = [{ n: 'Prateria', x: 0, y: 0, w: W, h: H, c: ['#7fa54a', '#7aa046'], wc: 'none', k: 'prat', nl: 1, nm: 1 }];
    return { ok: okAll, w: W, h: H, rooms, doors: [], decals, props, holes: [], trees, bg: () => '#2f4a26', deco: deco2, tasks: [], hall: 0, cams: [], vending: [], ring,
      button: { x: -10, y: -10 }, sabs: {}, inn: { Prateria: 'nella prateria' }, help: '', btnTxt: '', sabTxt: '', draw, floor: FLOOR, drawWall: () => {}, hz, hb: 0.55, hzSide, decoDraw, ground,
      ter, camp: C2, places: { eat, drink, sleep }, lm, fav, n0, decoTall: ['reedT'], burrows: burrows.filter(b => ok(Math.floor(b.x), Math.floor(b.y))), ponds, vert, riv, fords, seed };
  }

  // ---- disegno della mappa (K = attrezzi di cqTools) ----
  const TERC = { 1: ['#86a84e', '#81a24a'], 2: ['#6f9c40', '#6a963d'], 3: ['#5a7a3c', '#567539'], 4: ['#86735a', '#806e56'], 5: ['#7fd0e6', '#78c9df'], 6: ['#4aa8e6', '#47a2df'], 7: ['#a08a64', '#9b8560'], 8: ['#7db54c', '#78b048'], 9: ['#5d7a46', '#587542'], 10: ['#b3a66a', '#ada065'], 11: ['#9a968c', '#949086'], 12: ['#b88e5c', '#b28857'], 13: ['#86d9cf', '#80d3c9'], 14: ['#d4f0f8', '#cdeaf3'] };
  const FLOOR = {
    prat(K, x, y) {
      const t = CQ_MAP.ter[y][x], P2 = (u, v) => K.S(x + u, y + v, 0), col = TERC[t] || TERC[1];
      K.poly([P2(0, 0), P2(1, 0), P2(1, 1), P2(0, 1)], col[(x + y) % 2]);
      if (K.TW < 40) return;
      if (t === 13) { K.speck(x, y, 6, ['rgba(255,255,255,.5)', 'rgba(170,250,236,.6)'], K.TW / 13); return; }
      if (t === 14) { const L = []; for (let i = 0; i < 6; i++) { const u = 0.05 + 0.7 * K.hsh(x, y, i), v = 0.08 + 0.84 * K.hsh(x, y, i + 9); L.push([P2(u, v), P2(u + 0.22, v + 0.03)]); } K.strokes(L, 'rgba(255,255,255,.9)', Math.max(1.5, K.TW / 16)); return; }
      const gl = t === 6 && CQ_MAP.lm && CQ_MAP.lm.glade;
      if (gl && Math.hypot(x + 0.5 - gl.x, y + 0.5 - gl.y) < 3.3) {   // ninfee dello stagno della radura
        const g = K.g; for (let i = 0; i < 2; i++) { if (K.hsh(x, y, 80 + i) < 0.3) continue; const [X, Y] = P2(0.25 + 0.5 * K.hsh(x, y, 82 + i), 0.25 + 0.5 * K.hsh(x, y, 84 + i)), rx = K.TW * 0.15, a0 = K.hsh(x, y, 86 + i) * 6;
          g.fillStyle = '#3f7a34'; g.beginPath(); g.ellipse(X, Y + 1, rx, rx * 0.5, 0, 0, 7); g.fill(); g.fillStyle = '#5c9e44'; g.beginPath(); g.ellipse(X, Y, rx, rx * 0.5, 0, a0 + 0.35, a0 + 6.0); g.lineTo(X, Y); g.fill();
          if (K.hsh(x, y, 88 + i) < 0.45) { g.fillStyle = '#f4a6cc'; for (let k = 0; k < 5; k++) { const q = k / 5 * 6.28; g.beginPath(); g.ellipse(X + Math.cos(q) * rx * 0.28, Y - 2 + Math.sin(q) * rx * 0.14, rx * 0.2, rx * 0.12, q, 0, 7); g.fill(); } g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(X, Y - 2, rx * 0.12, 0, 7); g.fill(); } }
        return;
      }
      if (t === 9) { K.speck(x, y, 7, ['rgba(30,50,26,.4)', 'rgba(130,180,200,.35)', 'rgba(90,120,60,.4)'], K.TW / 16); return; }
      if (t === 11) { K.strokes([[P2(0.05, 0.45), P2(0.6, 0.5)], [P2(0.6, 0.5), P2(0.95, 0.3)], [P2(0.5, 0.05), P2(0.6, 0.5)]], 'rgba(60,58,52,.35)'); K.speck(x, y, 3, ['rgba(232,212,90,.55)', 'rgba(255,255,255,.25)'], K.TW / 22); return; }
      if (t === 12) { K.speck(x, y, 7, ['rgba(150,70,36,.35)', 'rgba(232,190,120,.35)'], K.TW / 20); return; }
      if (t === 6 || t === 5) { if (K.hsh(x, y, 70) < 0.4) { const u = 0.1 + 0.6 * K.hsh(x, y, 71), v = 0.15 + 0.7 * K.hsh(x, y, 72); K.poly([P2(u, v), P2(u + 0.3, v), P2(u + 0.3, v + 0.05), P2(u, v + 0.05)], t === 5 ? '#c4f2ff' : '#8cd4ff'); } if (t === 5) K.speck(x, y, 4, ['rgba(140,120,90,.35)'], K.TW / 18); return; }
      if (t === 4) { K.speck(x, y, 6, ['rgba(60,45,30,.35)', 'rgba(160,140,110,.3)'], K.TW / 20); return; }
      if (t === 7) { K.speck(x, y, 6, ['rgba(70,55,35,.3)', 'rgba(190,170,130,.3)'], K.TW / 22); return; }
      K.speck(x, y, 5, t === 3 ? ['rgba(30,50,20,.35)', 'rgba(120,90,50,.25)'] : t === 10 ? ['rgba(240,220,150,.4)', 'rgba(120,100,50,.3)'] : t === 8 ? ['rgba(230,245,140,.4)', 'rgba(40,90,30,.25)'] : ['rgba(200,210,110,.3)', 'rgba(40,70,20,.22)'], K.TW / 22);
      const Ls = []; for (let i = 0; i < 3; i++) { const u = 0.15 + 0.7 * K.hsh(x, y, 20 + i), v = 0.15 + 0.7 * K.hsh(x, y, 30 + i); Ls.push([K.S(x + u, y + v, 0), K.S(x + u + 0.04, y + v, 0.12 + 0.1 * K.hsh(x, y, 40 + i))]); }
      K.strokes(Ls, t === 2 ? 'rgba(150,200,90,.6)' : t === 3 ? 'rgba(90,130,60,.5)' : t === 8 ? 'rgba(160,220,90,.7)' : t === 10 ? 'rgba(220,196,120,.7)' : 'rgba(200,200,110,.55)');
    }
  };
  // le tracce stanno nel disegno del terreno (sotto alberi, mammut e persone): ogni cella disegna le sue, col loro stato (fresca, tiepida, vecchia)
  const FLOOR0 = FLOOR.prat;
  // in pianura si disegnano tutte insieme dopo i pavimenti (ground); sulle colline con la loro casella (che si alza)
  const groundTr = (K, t, x, y) => { const G = cq.g, sg = stageOf(G, t); if (sg < 0) return; drawTrack(K, t, [0.95, 0.75, 0.45, 0.22][sg]); G.trD.set(t.id, [sg, x, y]); };
  const trOn = () => { const G = cq.g; if (!G || G.mode !== 'mammut' || !G.tr) return null; if (!G.trD) G.trD = new Map(); return G; };
  FLOOR.prat = (K, x, y) => {
    FLOOR0(K, x, y);
    const G = trOn(); if (!G || K.TW < 20 || !cqHc(x, y)) return;
    const L2 = cellTracks(G).get(x + ',' + y); if (L2) for (const t of L2) groundTr(K, t, x, y);
  };
  function ground(K) {
    const G = trOn(); if (!G || K.TW < 20) return;
    for (const t of G.tr) { const x = Math.floor(t.x), y = Math.floor(t.y); if (!cqHc(x, y)) groundTr(K, t, x, y); }
  }
  function hzSide(x, y, i, z) { if (i === z - 1) return CQ_MAP.ter[y][x] === 2 ? '#5f8a38' : '#76984a'; return i % 2 ? '#8a7656' : '#7f6c4e'; }
  function decoDraw(K, t, x, y) {
    const { bx, dot, hsh, S, strokes } = K;
    if (t === 'tgrass') { const Ls = []; for (let i = 0; i < 9; i++) { const u = 0.1 + 0.8 * hsh(x, y, 50 + i), v = 0.1 + 0.8 * hsh(x, y, 60 + i), h = 0.3 + 0.35 * hsh(x, y, 70 + i); Ls.push([S(x + u, y + v, 0), S(x + u + 0.06 * (hsh(x, y, 80 + i) - 0.5), y + v, h)]); } strokes(Ls, 'rgba(170,200,90,.9)', Math.max(1.5, K.TW / 28)); return; }
    if (t === 'reed') { const Ls = []; for (let i = 0; i < 5; i++) { const u = 0.2 + 0.6 * hsh(x, y, 50 + i), v = 0.2 + 0.6 * hsh(x, y, 60 + i); Ls.push([S(x + u, y + v, 0), S(x + u, y + v, 0.6 + 0.3 * hsh(x, y, 70 + i))]); } strokes(Ls, '#6e8a3a', Math.max(1.5, K.TW / 26)); for (let i = 0; i < 2; i++) dot(x + 0.3 + 0.4 * hsh(x, y, 90 + i), y + 0.4 + 0.3 * hsh(x, y, 95 + i), 0.75, 0.045, '#6a4a2a'); return; }
    if (t === 'flower') { for (let i = 0; i < 3; i++) dot(x + 0.2 + 0.6 * hsh(x, y, 40 + i), y + 0.2 + 0.6 * hsh(x, y, 45 + i), 0.08, 0.04, ['#f4e04a', '#f4f0e8', '#c870d0'][Math.floor(hsh(x, y, 49) * 3)]); return; }
    if (t === 'tuft') { const Ls = []; for (let i = 0; i < 4; i++) { const u = 0.4 + 0.2 * hsh(x, y, 50 + i), v = 0.4 + 0.2 * hsh(x, y, 60 + i); Ls.push([S(x + u, y + v, 0), S(x + u + 0.1 * (i - 1.5), y + v, 0.25)]); } strokes(Ls, 'rgba(110,150,60,.85)', Math.max(1.5, K.TW / 28)); return; }
    if (t === 'fern') { const Ls = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; Ls.push([S(x + 0.5, y + 0.5, 0.05), S(x + 0.5 + Math.cos(a) * 0.3, y + 0.5 + Math.sin(a) * 0.3, 0.2)]); } strokes(Ls, '#3f7a36', Math.max(2, K.TW / 18)); return; }
    if (t === 'mush') { bx(x + 0.45, y + 0.45, x + 0.52, y + 0.52, 0, 0.12, '#e8e0cc'); dot(x + 0.48, y + 0.48, 0.15, 0.08, '#b8402a'); return; }
    if (t === 'pebble') { bx(x + 0.3, y + 0.35, x + 0.55, y + 0.55, 0, 0.1, '#9a958a'); bx(x + 0.6, y + 0.55, x + 0.72, y + 0.68, 0, 0.07, '#8a857a'); return; }
    if (t === 'reedT') {   // canne alte con le pannocchie scure (ci si nasconde dentro)
      const Ls = [], Ld = [];
      for (let i = 0; i < 8; i++) { const u = 0.1 + 0.8 * hsh(x, y, 50 + i), v = 0.1 + 0.8 * hsh(x, y, 60 + i), h = 1.0 + 0.55 * hsh(x, y, 70 + i), b = 0.08 * (hsh(x, y, 75 + i) - 0.5); (i % 2 ? Ls : Ld).push([S(x + u, y + v, 0), S(x + u + b, y + v, h)]); }
      strokes(Ld, '#56702e', Math.max(1.5, K.TW / 24)); strokes(Ls, '#7f9a42', Math.max(1.5, K.TW / 24));
      for (let i = 0; i < 4; i++) { const u = 0.1 + 0.8 * hsh(x, y, 50 + i * 2 + 1), v = 0.1 + 0.8 * hsh(x, y, 60 + i * 2 + 1), h = 1.0 + 0.55 * hsh(x, y, 70 + i * 2 + 1), b = 0.08 * (hsh(x, y, 75 + i * 2 + 1) - 0.5); if (hsh(x, y, 90 + i) < 0.55) { const [X, Y] = S(x + u + b, y + v, h - 0.12); K.g.fillStyle = '#5a3a1e'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW * 0.035, K.TW * 0.1, 0, 0, 7); K.g.fill(); } }
      const Lf = []; for (let i = 0; i < 3; i++) { const u = 0.2 + 0.6 * hsh(x, y, 95 + i), v = 0.2 + 0.6 * hsh(x, y, 97 + i); Lf.push([S(x + u, y + v, 0.1), S(x + u + 0.25, y + v, 0.7)]); } strokes(Lf, '#9ab452', Math.max(2, K.TW / 18)); return; }
    if (t === 'puddle') { const [X, Y] = S(x + 0.5, y + 0.5, 0); K.g.fillStyle = 'rgba(110,160,180,.55)'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW * 0.3, K.TW * 0.13, 0, 0, 7); K.g.fill(); K.g.fillStyle = 'rgba(220,240,255,.45)'; K.g.beginPath(); K.g.ellipse(X - K.TW * 0.08, Y - 1, K.TW * 0.1, K.TW * 0.03, 0, 0, 7); K.g.fill(); return; }
    if (t === 'dtuft') { const Ls = []; for (let i = 0; i < 5; i++) { const u = 0.35 + 0.3 * hsh(x, y, 50 + i), v = 0.35 + 0.3 * hsh(x, y, 60 + i); Ls.push([S(x + u, y + v, 0), S(x + u + 0.12 * (i - 2), y + v, 0.28)]); } strokes(Ls, '#c8b070', Math.max(1.5, K.TW / 28)); return; }
    if (t === 'bones') {   // ossa sparse: femori con le teste tonde
      for (let i = 0; i < 2; i++) { const u = 0.25 + 0.5 * hsh(x, y, 40 + i), v = 0.25 + 0.5 * hsh(x, y, 45 + i), a = hsh(x, y, 49 + i) * 3, l = 0.18; const p = S(x + u - Math.cos(a) * l, y + v - Math.sin(a) * l, 0.03), q = S(x + u + Math.cos(a) * l, y + v + Math.sin(a) * l, 0.03); K.line(p, q, '#e8dfc8', Math.max(2, K.TW / 14)); for (const e of [p, q]) { K.g.fillStyle = '#f2ead6'; K.g.beginPath(); K.g.arc(e[0], e[1], K.TW / 16, 0, 7); K.g.fill(); } }
      return; }
    if (t === 'burrow') { const [X, Y] = S(x + 0.5, y + 0.5, 0); K.g.fillStyle = '#6a5438'; K.g.beginPath(); K.g.ellipse(X, Y, K.TW * 0.26, K.TW * 0.13, 0, 0, 7); K.g.fill(); K.g.fillStyle = '#22180e'; K.g.beginPath(); K.g.ellipse(X, Y + 1, K.TW * 0.15, K.TW * 0.075, 0, 0, 7); K.g.fill(); return; }
  }
  function draw(K, t, x, y, o) {
    const { bx, cyl, dot, line, S, poly, hsh, glow, qL } = K;
    switch (t) {
      case 'wat': break;   // l'acqua si disegna col pavimento; l'oggetto serve solo a non farci camminare
      case 'thick': for (let i = 0; i < 3; i++) { const u = 0.1 + 0.5 * hsh(x, y, 10 + i), v = 0.1 + 0.5 * hsh(x, y, 20 + i), h = 0.7 + 0.6 * hsh(x, y, 30 + i); bx(x + u - 0.05, y + v - 0.05, x + u + 0.45, y + v + 0.45, 0, h, ['#3a5a2a', '#44663a', '#355427'][i]); } break;
      case 'boulder': { const C3 = [['#8e8a82', '#a29e95'], ['#857f74', '#9a9488'], ['#938e84', '#aaa59a']][Math.floor(hsh(x, y, 77) * 3)], h = 0.7 + 0.6 * hsh(x, y, 78); bx(x + 0.05, y + 0.08, x + 0.95, y + 0.95, 0, h, C3[0]); bx(x + 0.2, y + 0.2, x + 0.8, y + 0.78, h, h + 0.35, C3[1]); if (hsh(x, y, 79) < 0.5) bx(x + 0.2, y + 0.2, x + 0.5, y + 0.45, h + 0.35, h + 0.4, '#5a8a44'); break; }
      case 'mfire': {   // cerchio di sassi e catasta; le fiamme si muovono e si disegnano sopra (over)
        for (let i = 0; i < 10; i++) { const a = i * Math.PI * 2 / 10, u = 0.5 + Math.cos(a) * 0.4, v = 0.5 + Math.sin(a) * 0.4; bx(x + u - 0.08, y + v - 0.07, x + u + 0.08, y + v + 0.08, 0, 0.12 + 0.05 * (i % 2), '#8a8884'); }
        bx(x + 0.28, y + 0.44, x + 0.72, y + 0.56, 0, 0.12, '#5a3a24'); bx(x + 0.44, y + 0.28, x + 0.56, y + 0.72, 0.12, 0.22, '#6b4a2e'); dot(x + 0.5, y + 0.5, 0.05, 0.16, '#3a2a20'); break; }
      case 'hide': {   // tenda di pelli a cono con i pali che spuntano
        const cols = [['#b08a5a', '#9a7448'], ['#a07850', '#8a6440'], ['#c09a68', '#a8844e']][o.v || 0], top = S(x + 0.5, y + 0.5, 1.9);
        poly([S(x + 0.05, y + 0.95, 0), S(x + 0.95, y + 0.95, 0), top], cols[0]); poly([S(x + 0.95, y + 0.05, 0), S(x + 0.95, y + 0.95, 0), top], cols[1]);
        poly([S(x + 0.35, y + 0.95, 0), S(x + 0.62, y + 0.95, 0), S(x + 0.5, y + 0.95, 0.7)], '#2a1e14');
        for (const [u, v] of [[0.3, 0.3], [0.7, 0.3], [0.5, 0.75]]) line(top, S(x + 0.5 + (u - 0.5) * 0.4, y + 0.5 + (v - 0.5) * 0.4, 2.35), '#6b4a2e', Math.max(2, K.TW / 18));
        K.strokes([[S(x + 0.2, y + 0.95, 0.4), S(x + 0.8, y + 0.95, 0.4)], [S(x + 0.95, y + 0.2, 0.4), S(x + 0.95, y + 0.8, 0.4)]], '#e8d0a0', 2); break; }
      case 'sprack': {   // rastrelliera delle lance
        bx(x + 0.1, y + 0.4, x + 0.9, y + 0.5, 0.6, 0.7, '#6b4a2e'); bx(x + 0.12, y + 0.42, x + 0.2, y + 0.5, 0, 0.75, '#5a3e26'); bx(x + 0.8, y + 0.42, x + 0.88, y + 0.5, 0, 0.75, '#5a3e26');
        for (let i = 0; i < 4; i++) { const u = 0.22 + i * 0.18; line(S(x + u, y + 0.6, 0), S(x + u + 0.05, y + 0.45, 1.6), '#8a6a42', Math.max(2, K.TW / 20)); poly([S(x + u + 0.05, y + 0.45, 1.6), S(x + u + 0.02, y + 0.45, 1.75), S(x + u + 0.08, y + 0.45, 1.75)], '#d8d0c0'); } break; }
      case 'mdry': {   // telaio per seccare la carne e le pelli
        for (const u of [0.1, 0.9]) line(S(x + u, y + 0.5, 0), S(x + u, y + 0.5, 1.2), '#6b4a2e', Math.max(2, K.TW / 18));
        line(S(x + 0.1, y + 0.5, 1.15), S(x + 0.9, y + 0.5, 1.15), '#6b4a2e', Math.max(2, K.TW / 18));
        poly([S(x + 0.2, y + 0.5, 1.1), S(x + 0.45, y + 0.5, 1.1), S(x + 0.45, y + 0.5, 0.55), S(x + 0.2, y + 0.5, 0.6)], '#b88a5a'); poly([S(x + 0.55, y + 0.5, 1.1), S(x + 0.8, y + 0.5, 1.1), S(x + 0.78, y + 0.5, 0.7), S(x + 0.55, y + 0.5, 0.65)], '#a85a3a'); break; }
      case 'skull': {   // cranio di mammut con le zanne all'ingresso del campo
        bx(x + 0.25, y + 0.25, x + 0.75, y + 0.75, 0, 0.55, '#e8e0cc'); bx(x + 0.32, y + 0.7, x + 0.42, y + 0.76, 0.25, 0.4, '#2a2018'); bx(x + 0.58, y + 0.7, x + 0.68, y + 0.76, 0.25, 0.4, '#2a2018');
        for (const s of [-1, 1]) { const a = S(x + 0.5 + s * 0.2, y + 0.75, 0.15), b = S(x + 0.5 + s * 0.6, y + 1.05, 0.55), c2 = S(x + 0.5 + s * 0.35, y + 1.1, 1.0); K.g.strokeStyle = '#f2ead8'; K.g.lineWidth = Math.max(3, K.TW / 9); K.g.lineCap = 'round'; K.g.beginPath(); K.g.moveTo(...a); K.g.quadraticCurveTo(b[0], b[1], c2[0], c2[1]); K.g.stroke(); } break; }
      case 'stash': {   // scorte del campo: cesta di vimini (i conigli si vedono sopra, over)
        cyl(x + 0.5, y + 0.5, 0.32, 0, 0.45, '#a8844e'); cyl(x + 0.5, y + 0.5, 0.28, 0.45, 0.47, '#4a3420'); K.strokes([[S(x + 0.18, y + 0.82, 0.15), S(x + 0.82, y + 0.82, 0.15)], [S(x + 0.18, y + 0.82, 0.3), S(x + 0.82, y + 0.82, 0.3)]], '#8a6a3a', 1.5); break; }
      case 'stump': cyl(x + 0.5, y + 0.5, 0.26, 0, 0.35, '#6b4a2e'); cyl(x + 0.5, y + 0.5, 0.19, 0.35, 0.36, '#d8b07a'); break;
      // ---- luoghi speciali ----
      case 'willow': {   // salice piangente: tronco storto e chioma che ricade in fili
        const g = K.g, v = o.v || 0; cyl(x + 0.5, y + 0.5, 0.17, 0, 1.3, '#6a5034'); line(S(x + 0.5, y + 0.5, 1.2), S(x + 0.3, y + 0.5, 1.9), '#6a5034', Math.max(3, K.TW / 10));
        const [X, Y] = S(x + 0.5, y + 0.5, 2.35), R = K.TW * 0.95;
        g.fillStyle = ['#557f34', '#5d8a38', '#4f7a30'][v]; g.beginPath(); g.ellipse(X, Y, R, R * 0.62, 0, 0, 7); g.fill();
        g.fillStyle = ['#7aa648', '#83b04c', '#73a044'][v]; g.beginPath(); g.ellipse(X - R * 0.15, Y - R * 0.18, R * 0.7, R * 0.4, 0, 0, 7); g.fill();
        g.lineCap = 'round';
        for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, px = X + Math.cos(a) * R * (0.55 + 0.4 * hsh(x, y, i)), py = Y + Math.sin(a) * R * 0.5, l = K.TW * (0.8 + 0.7 * hsh(x, y, 30 + i)) * (Math.sin(a) > -0.2 ? 1 : 0.5);
          g.strokeStyle = i % 3 ? '#6f9a40' : '#94bf58'; g.lineWidth = Math.max(1.5, K.TW / 26); g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + K.TW * 0.08, py + l * 0.5, px - K.TW * 0.03, py + l); g.stroke(); }
        break; }
      case 'gtree': {   // ALBERO MILLENARIO (2x2): tronco enorme con le radici e chioma a nuvole; lo disegna la casella davanti
        if (!o.main) break;
        const g = K.g, cx = x, cy = y;
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.3, l = 1.05 + 0.3 * hsh(x, y, i); line(S(cx + Math.cos(a) * 0.5, cy + Math.sin(a) * 0.5, 0.35), S(cx + Math.cos(a) * l, cy + Math.sin(a) * l, 0), '#5a4028', Math.max(4, K.TW / 5)); }
        cyl(cx, cy, 0.78, 0, 2.8, '#6e5236');
        const [Xb, Yb] = S(cx, cy, 0), [Xt, Yt] = S(cx, cy, 2.8), rw = 0.78 * K.TW * 0.707;
        g.strokeStyle = 'rgba(40,26,14,.45)'; g.lineWidth = Math.max(1.5, K.TW / 22); for (let i = 0; i < 6; i++) { const u = -0.8 + i * 0.32; g.beginPath(); g.moveTo(Xb + u * rw, Yb); g.bezierCurveTo(Xb + (u + 0.12) * rw, Yb - (Yb - Yt) * 0.35, Xb + (u - 0.1) * rw, Yb - (Yb - Yt) * 0.7, Xb + u * rw, Yt); g.stroke(); }
        g.fillStyle = '#2a1a0c'; g.beginPath(); g.ellipse(Xb + rw * 0.15, Yb - (Yb - Yt) * 0.35, rw * 0.18, rw * 0.3, 0, 0, 7); g.fill();   // cavita' nel tronco
        for (const [a, l] of [[-0.6, 1.2], [0.5, 1.3], [2.4, 1.1]]) line(S(cx, cy, 2.6), S(cx + Math.cos(a) * l, cy + Math.sin(a) * l, 3.6), '#6e5236', Math.max(5, K.TW / 4));
        const [X, Y] = S(cx, cy, 4.3), R = K.TW;
        const blobs = [[-1.5, 0.3, 1.05, '#3e6a2c'], [1.4, 0.35, 1.0, '#3e6a2c'], [0, 0.55, 1.3, '#3a6428'], [-0.8, -0.5, 1.15, '#4a7a34'], [0.9, -0.55, 1.1, '#4a7a34'], [0, -1, 1.15, '#558a3a'], [-0.4, -0.3, 0.8, '#64994a'], [0.6, -1.2, 0.6, '#76ab56'], [-1.1, -0.9, 0.55, '#6ea050']];
        for (const [dx, dy, r, c] of blobs) { g.fillStyle = c; g.beginPath(); g.ellipse(X + dx * R, Y + dy * R, r * R, r * R * 0.78, 0, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(170,210,110,.45)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(X + (hsh(x, y, 60 + i) - 0.5) * R * 3, Y + (hsh(x, y, 70 + i) - 0.7) * R * 1.6, R * 0.09, 0, 7); g.fill(); }
        break; }
      case 'menhir': {   // pietra alta con muschio e spirali incise (quelle davanti sono basse, spezzate)
        const h = o.low ? 0.7 + 0.2 * hsh(x, y, 3) : 1.9 + 0.7 * hsh(x, y, 4), c = ['#8f8b82', '#86827a', '#99958b'][o.v % 3];
        bx(x + 0.22, y + 0.3, x + 0.78, y + 0.7, 0, h, c); bx(x + 0.3, y + 0.36, x + 0.7, y + 0.64, h, h + 0.25, c);
        bx(x + 0.22, y + 0.3, x + 0.5, y + 0.5, h * 0.35, h * 0.5, '#6a8a48');
        if (!o.low) { const g = K.g, [X, Y] = S(x + 0.5, y + 0.7, h * 0.6); g.strokeStyle = 'rgba(40,36,30,.55)'; g.lineWidth = Math.max(1.2, K.TW / 34); g.beginPath(); for (let k = 0; k < 22; k++) { const a = k * 0.5, r = K.TW * 0.0055 * k; const px = X + Math.cos(a) * r * 0.6, py = Y + Math.sin(a) * r * 0.6; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
        break; }
      case 'pwall': {   // parete di arenaria del riparo: le pitture sono sulla faccia davanti (y+0.95)
        const i = o.i || 0, h = 2.3 + 0.35 * Math.sin(i * 1.7) + (i === 0 || i === 6 ? -0.5 : 0), c = '#b49a78';
        bx(x, y + 0.15, x + 1, y + 0.95, 0, h, c); bx(x + 0.05, y + 0.1, x + 0.95, y + 0.85, h, h + 0.3, '#a68c6c');
        bx(x, y + 0.75, x + 1, y + 1.2, h - 0.2, h + 0.05, '#9c8264');   // sporgenza del riparo
        if (hsh(x, y, 5) < 0.6) bx(x + 0.2, y + 0.2, x + 0.6, y + 0.6, h + 0.3, h + 0.36, '#6a8a48');
        paintings(K, x, y + 0.951, i, h); break; }
      case 'dolm': {   // dolmen: pietre ritte e la grande lastra sopra (la disegna la pietra davanti a destra)
        const c = '#8c887e';
        if (o.s === 'bk') bx(x + 0.05, y + 0.15, x + 0.95, y + 0.55, 0, 1.25, c); else bx(x + 0.15, y + 0.2, x + 0.85, y + 0.8, 0, 1.3, c);
        if (o.s === 'fr') { bx(x - 1.9, y - 0.95, x + 0.92, y + 0.88, 1.3, 1.66, '#9c988e'); bx(x - 1.5, y - 0.7, x - 0.6, y + 0.1, 1.66, 1.72, '#6a8a48'); bx(x - 0.3, y - 0.4, x + 0.4, y + 0.5, 1.66, 1.7, '#7a9a54'); }
        break; }
      case 'tusks': {   // due zanne giganti piantate nel terreno che formano un arco
        const g = K.g, v = o.v || 0; bx(x + 0.15, y + 0.3, x + 0.85, y + 0.7, 0, 0.12, '#9a8a62');
        for (const sd of [-1, 1]) { const a = S(x + 0.5 + sd * 0.35, y + 0.5, 0.05), b = S(x + 0.5 + sd * 0.45, y + 0.5, 1.4 + v * 0.15), c2 = S(x + 0.5 + sd * 0.06, y + 0.5, 1.9 + v * 0.2); g.lineCap = 'round'; g.strokeStyle = '#d8cdb0'; g.lineWidth = Math.max(4, K.TW / 6); g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(b[0], b[1], c2[0], c2[1]); g.stroke(); g.strokeStyle = '#f4ecd8'; g.lineWidth = Math.max(2, K.TW / 14); g.beginPath(); g.moveTo(a[0] - 1, a[1]); g.quadraticCurveTo(b[0] - 1, b[1], c2[0], c2[1]); g.stroke(); }
        break; }
      case 'mskull': {   // grande cranio mezzo sepolto con la zanna spezzata
        bx(x + 0.1, y + 0.2, x + 0.9, y + 0.85, 0, 0.7, '#e2d8c0'); bx(x + 0.2, y + 0.25, x + 0.8, y + 0.75, 0.7, 0.95, '#ece4d0');
        bx(x + 0.25, y + 0.84, x + 0.42, y + 0.86, 0.35, 0.55, '#2a2018'); bx(x + 0.58, y + 0.84, x + 0.75, y + 0.86, 0.35, 0.55, '#2a2018');
        line(S(x + 0.5, y + 0.86, 0.6), S(x + 0.62, y + 0.86, 0.85), '#5a4a30', 1.5);
        const g = K.g, a = S(x + 0.3, y + 0.86, 0.2), b = S(x + 0.1, y + 1.2, 0.3); g.strokeStyle = '#f2ead8'; g.lineWidth = Math.max(3, K.TW / 9); g.lineCap = 'round'; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
        break; }
      case 'ribs': {   // costato di mammut: archi d'osso sulla colonna
        line(S(x + 0.05, y + 0.5, 0.08), S(x + 0.95, y + 0.5, 0.08), '#d8cdb0', Math.max(3, K.TW / 10));
        const g = K.g; g.lineCap = 'round';
        for (let i = 0; i < 5; i++) { const u = 0.12 + i * 0.19, hh = 0.9 + 0.35 * Math.sin(i / 4 * Math.PI); for (const sd of [-1, 1]) { const a = S(x + u, y + 0.5, 0.1), b = S(x + u, y + 0.5 + sd * 0.42, hh), c2 = S(x + u + 0.04, y + 0.5 + sd * 0.38, 0.05); g.strokeStyle = sd > 0 ? '#efe6d0' : '#cfc4a8'; g.lineWidth = Math.max(2, K.TW / 16); g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(b[0], b[1], c2[0], c2[1]); g.stroke(); } }
        break; }
      case 'srock': { const c = ['#8a8270', '#7e7868', '#948c7a'][o.v || 0]; bx(x + 0.12, y + 0.15, x + 0.88, y + 0.85, 0, 0.45, c); bx(x + 0.25, y + 0.25, x + 0.75, y + 0.7, 0.45, 0.62, c); K.speck(x, y, 3, ['#e8d058'], K.TW / 18); break; }   // rocce della sorgente con lo zolfo giallo
      case 'wrock': { const c = ['#5e625e', '#666a64', '#585c58'][o.v || 0], h = 0.55 + 0.4 * hsh(x, y, 9); bx(x + 0.05, y + 0.08, x + 0.95, y + 0.92, 0, h, c); bx(x + 0.2, y + 0.2, x + 0.8, y + 0.7, h, h + 0.22, c); if (hsh(x, y, 8) < 0.5) bx(x + 0.2, y + 0.2, x + 0.5, y + 0.45, h + 0.22, h + 0.26, '#4e7a3c'); break; }
      case 'fall': {   // gradino della cascata: roccia e velo d'acqua che cade verso la casella dopo (la schiuma e' nel pavimento)
        const g = K.g, vt = o.vert;
        bx(x, y, x + 1, y + 1, 0, 0.4, '#5a5e5a');
        poly([S(x, y, 0.4), S(x + 1, y, 0.4), S(x + 1, y + 1, 0.4), S(x, y + 1, 0.4)], '#5aaee8');
        const A = vt ? S(x, y + 1, 0.4) : S(x + 1, y, 0.4), B = vt ? S(x + 1, y + 1, 0.4) : S(x + 1, y + 1, 0.4), A0 = vt ? S(x, y + 1, 0) : S(x + 1, y, 0), B0 = vt ? S(x + 1, y + 1, 0) : S(x + 1, y + 1, 0);
        poly([A, B, B0, A0], '#bfe8fa');
        g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1.5, K.TW / 26); g.beginPath(); for (let i = 1; i < 6; i++) { const k = i / 6; g.moveTo(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k); g.lineTo(A0[0] + (B0[0] - A0[0]) * k, A0[1] + (B0[1] - A0[1]) * k); } g.stroke();
        break; }
    }
  }
  // pitture rupestri sulla faccia di un pezzo di parete (u 0-1 lungo la parete, z altezza): mammut, cacciatori con le lance, mani, spirali
  function paintings(K, x, yf, i, h) {
    const g = K.g, P = (u, z) => K.S(x + u, yf, z), RED = '#9e3a22', DK = '#2e1e14', YEL = '#c98a30', WH = '#eadcc0';
    const shape = (pts, col, ox = 0, oz = 0, s = 1) => { g.fillStyle = col; g.beginPath(); pts.forEach(([u, z], k) => { const p = P(ox + u * s, oz + z * s); k ? g.lineTo(...p) : g.moveTo(...p); }); g.closePath(); g.fill(); };
    const ln = (pts, col, w, ox = 0, oz = 0, s = 1) => { g.strokeStyle = col; g.lineWidth = Math.max(1, K.TW * w); g.lineCap = 'round'; g.beginPath(); pts.forEach(([u, z], k) => { const p = P(ox + u * s, oz + z * s); k ? g.lineTo(...p) : g.moveTo(...p); }); g.stroke(); };
    const mam = (ox, oz, s, col) => {
      shape([[0, 0.15], [0.03, 0.42], [0.16, 0.6], [0.36, 0.64], [0.5, 0.78], [0.66, 0.7], [0.74, 0.5], [0.8, 0.26], [0.86, 0.06], [0.81, 0.04], [0.74, 0.24], [0.7, 0.3], [0.68, 0.15], [0.66, 0], [0.57, 0], [0.56, 0.2], [0.26, 0.2], [0.24, 0], [0.15, 0], [0.12, 0.18]], col, ox, oz, s);
      ln([[0.7, 0.36], [0.82, 0.3], [0.9, 0.42]], WH, 0.025, ox, oz, s);
    };
    const man = (ox, oz, s, col, sp) => { ln([[0.5, 0.75], [0.5, 0.35], [0.36, 0], [0.5, 0.35], [0.64, 0]], col, 0.03, ox, oz, s); ln([[0.5, 0.62], [0.72, 0.5]], col, 0.03, ox, oz, s); const p = P(ox + 0.5 * s, oz + 0.85 * s); g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], K.TW * 0.035 * s * 2, 0, 7); g.fill(); if (sp) ln([[0.3, 0.3], [1.0, 0.85]], col, 0.018, ox, oz, s); };
    const hand = (u, z, col) => { const p = P(u, z), r = K.TW * 0.05; g.fillStyle = col; g.beginPath(); g.ellipse(p[0], p[1], r, r * 1.1, 0, 0, 7); g.fill(); for (let k = 0; k < 5; k++) { const a = -2.6 + k * 0.42; g.beginPath(); g.ellipse(p[0] + Math.cos(a) * r * 1.7, p[1] + Math.sin(a) * r * 1.7, r * 0.3, r * 0.55, a + Math.PI / 2, 0, 7); g.fill(); } };
    const top = Math.min(1.9, h - 0.3);
    switch (i) {
      case 0: hand(0.35, 1.2, RED); hand(0.62, 0.95, YEL); hand(0.5, 1.55, RED); break;
      case 1: mam(0.08, 0.7, 0.8, RED); for (let k = 0; k < 5; k++) { const p = P(0.15 + k * 0.15, 0.45); g.fillStyle = DK; g.beginPath(); g.arc(p[0], p[1], K.TW * 0.02, 0, 7); g.fill(); } break;
      case 2: man(0.0, 0.65, 0.55, DK, 1); man(0.3, 0.75, 0.6, DK, 1); man(0.55, 0.62, 0.5, RED, 1); break;
      case 3: mam(0.02, 0.7, 0.95, DK); ln([[0.25, 1.5], [0.42, 1.05]], RED, 0.02); ln([[0.55, 1.6], [0.5, 1.1]], RED, 0.02); ln([[0.7, 1.5], [0.6, 1.08]], RED, 0.02); break;
      case 4: { const c = P(0.5, Math.min(1.35, top - 0.3)); g.strokeStyle = YEL; g.lineWidth = Math.max(1.2, K.TW / 28); g.beginPath(); for (let k = 0; k < 30; k++) { const a = k * 0.5, r = K.TW * 0.01 * k; const px = c[0] + Math.cos(a) * r, py = c[1] + Math.sin(a) * r * 0.85; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); ln([[0.1, 0.6], [0.25, 0.75], [0.4, 0.6], [0.55, 0.75], [0.7, 0.6], [0.85, 0.75]], RED, 0.025); break; }
      case 5: man(0.05, 0.7, 0.6, RED, 1); shape([[0.5, 0.75], [0.62, 0.95], [0.78, 0.98], [0.9, 1.1], [0.92, 0.95], [0.86, 0.75], [0.83, 0.6], [0.78, 0.75], [0.6, 0.75], [0.56, 0.6]], DK); { const p = P(0.75, top - 0.15); g.fillStyle = WH; g.beginPath(); g.arc(p[0], p[1], K.TW * 0.07, 0, 7); g.fill(); g.fillStyle = cqShade('#b49a78', 0.74); g.beginPath(); g.arc(p[0] + K.TW * 0.03, p[1] - 1, K.TW * 0.06, 0, 7); g.fill(); } break;
      case 6: hand(0.4, 1.1, YEL); for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const p = P(0.2 + k * 0.17, 0.55 + r * 0.14); g.fillStyle = RED; g.beginPath(); g.arc(p[0], p[1], K.TW * 0.018, 0, 7); g.fill(); } break;
    }
  }
  CQ_MAPS.prateria = { n: 'Prateria', make: mapPrateria, seeded: true, only: 'mammut' };

  // ======================= TRACCE =======================
  // { id, k: passo/fango/sterco/erba/ramo/corteccia/buca/sangue, x, y, t: quando, dx, dy: direzione, ct: creata (per mandarla agli amici) }
  const TR_LIFE = { foot: 210, mud: 230, dung: 400, graze: 260, branch: 320, bark: 400, bed: 520, blood: 220, nap: 360 };
  // stato di una traccia: 0 freschissima, 1 fresca, 2 di qualche minuto, 3 vecchia, -1 sparita
  function stageOf(G, t) { const a = G.time - t.t, L2 = TR_LIFE[t.k] || 200; return a > L2 ? -1 : a < L2 * 0.12 ? 0 : a < L2 * 0.4 ? 1 : a < L2 * 0.75 ? 2 : 3; }
  function cellTracks(G) {
    if (G.trCv === G.trN && G.trCl === G.tr.length && G.trC) return G.trC;
    const M = new Map(); for (const t of G.tr) { const k = Math.floor(t.x) + ',' + Math.floor(t.y); let a = M.get(k); if (!a) M.set(k, a = []); a.push(t); }
    G.trC = M; G.trCv = G.trN; G.trCl = G.tr.length; return M;
  }
  // su ogni telefono: le celle con tracce nuove, cambiate o sparite si ridisegnano nella mappa pronta (poche alla volta)
  function trackCells(G) {
    if (!cq.bg || !G.trD) return;
    const want = new Map(); for (const t of G.tr) { const sg = stageOf(G, t); if (sg >= 0) want.set(t.id, [sg, Math.floor(t.x), Math.floor(t.y)]); }
    const cells = new Set();
    for (const [id, v] of want) { const d = G.trD.get(id); if (!d || d[0] !== v[0]) cells.add(v[1] + ',' + v[2]); }
    for (const [id, d] of G.trD) if (!want.has(id)) { cells.add(d[1] + ',' + d[2]); G.trD.delete(id); }
    const L2 = [...cells].map(k => k.split(',').map(Number)).sort((a, b) => Math.hypot(a[0] - cq.x, a[1] - cq.y) - Math.hypot(b[0] - cq.x, b[1] - cq.y));
    L2.slice(0, L2.length && Math.hypot(L2[0][0] - cq.x, L2[0][1] - cq.y) < 22 ? 2 : 1).forEach(([x, y]) => cqBgCell(x, y, 1));   // prima quelle vicine, poche per volta (ognuna ridisegna un pezzo di mappa)
  }
  function track(G, k, x, y, dx, dy) {
    const t = { id: ++G.trN, k, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, t: G.time, dx: Math.round((dx || 0) * 100) / 100, dy: Math.round((dy || 0) * 100) / 100, ct: Math.max(0, G.time) };
    G.tr.push(t); if (G.tr.length > 420) G.tr.splice(0, G.tr.length - 420);
    return t;
  }
  // cosa racconta una traccia (vista da vicino)
  function trackTxt(G, t) {
    const a = G.time - t.t, f = a < 30 ? 'freschissima' : a < 90 ? 'fresca' : a < 200 ? 'di qualche minuto fa' : 'vecchia', dir = t.dx || t.dy ? ' · va verso ' + arrowOf(t.dx, t.dy) : '';
    switch (t.k) {
      case 'foot': return '🐾 Impronta di mammut, ' + f + dir;
      case 'mud': return '💧 Impronta fangosa, ' + f + ': ha appena bevuto. Ora cerca ombra o un pascolo' + dir;
      case 'dung': return a < 60 ? '💩 Sterco ancora fumante! È passato da pochissimo. Ha mangiato: ora avrà sete, andrà all\'acqua più vicina.' : '💩 Sterco ' + (a < 200 ? 'tiepido' : 'secco') + ': è passato di qui ' + (a < 200 ? 'qualche minuto fa' : 'tempo fa') + '.';
      case 'graze': return '🌾 Erba strappata, ' + f + ': ha pascolato qui. Dopo mangiato va a bere: cerca lo stagno o il fiume più vicino.';
      case 'branch': return '🌿 Rami spezzati, ' + f + ': è passato tra gli alberi' + dir;
      case 'bark': return '🪵 Corteccia grattata, ' + f + ': si è fermato a strofinarsi qui.';
      case 'bed': return (G.mm && G.mm.st === 'sleep' && Math.hypot(G.mm.x - t.x, G.mm.y - t.y) < 1.5) || a < 90 ? '🛏️ Buca per dormire ancora calda!' : '🛏️ Buca per dormire, ormai fredda: ci ha passato la notte.';
      case 'nap': return '🌳 Erba schiacciata all\'ombra, ' + f + ': ha riposato qui nelle ore calde.';
      case 'blood': return '🩸 Sangue ' + (a < 40 ? 'fresco' : 'rappreso') + ': il mammut è ferito!' + dir;
    }
    return '';
  }
  // tracce disegnate nel terreno in prospettiva (cerchi del mondo proiettati sulle caselle): erba schiacciata, fango, sterco...
  function drawTrack(K, t, al) {
    const { S, g, hsh } = K, x = t.x, y = t.y, a = (n, r, cx, cy, sx = 1) => { const p = []; for (let i = 0; i < n; i++) { const q = i / n * Math.PI * 2; p.push(S(cx + Math.cos(q) * r * sx, cy + Math.sin(q) * r, 0)); } return p; };
    const fill = (pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]); g.closePath(); g.fill(); };
    const rgba = (c, k) => 'rgba(' + c + ',' + Math.max(0, Math.min(1, k)).toFixed(3) + ')';
    const dl = Math.hypot(t.dx, t.dy) || 1, ux = (t.dx || 1) / dl, uy = (t.dy || 0) / dl;
    switch (t.k) {
      case 'foot': case 'mud': {   // impronta rotonda e larga: bordo d'erba sollevata, fondo schiacciato, 4 unghie davanti
        const mud = t.k === 'mud';
        fill(a(16, 0.27, x, y), rgba(mud ? '120,96,60' : '168,186,96', al * 0.55));
        fill(a(16, 0.22, x, y), rgba(mud ? '74,54,34' : '86,104,46', al * 0.62));
        fill(a(14, 0.15, x - ux * 0.02, y - uy * 0.02), rgba(mud ? '58,42,26' : '70,88,38', al * 0.55));
        if (mud) fill(a(10, 0.06, x - ux * 0.06 - uy * 0.05, y - uy * 0.06 + ux * 0.05), rgba('170,200,220', al * 0.4));
        for (const k of [-1.5, -0.5, 0.5, 1.5]) { const q = Math.atan2(uy, ux) + k * 0.42, cx = x + Math.cos(q) * 0.2, cy = y + Math.sin(q) * 0.2; fill(a(8, 0.04, cx, cy), rgba(mud ? '44,30,18' : '52,66,28', al * 0.7)); }
        break; }
      case 'dung': {   // tre mucchietti con la luce sopra
        for (const [dx, dy, r] of [[-0.09, 0.02, 0.1], [0.08, -0.03, 0.09], [0, -0.1, 0.075]]) { fill(a(12, r, x + dx, y + dy), rgba('70,48,26', 0.4 + al * 0.6)); const p = S(x + dx, y + dy, r * 0.9); g.fillStyle = rgba('116,82,46', 0.4 + al * 0.6); g.beginPath(); g.ellipse(p[0], p[1], r * K.TW * 0.55, r * K.TW * 0.32, 0, 0, 7); g.fill(); }
        break; }
      case 'graze': {   // erba strappata: chiazza piu' chiara con fili sdraiati
        fill(a(16, 0.38, x, y, 1.15), rgba('196,190,104', al * 0.45));
        const L = []; for (let i = 0; i < 7; i++) { const u = (hsh(Math.floor(x * 9), Math.floor(y * 9), i) - 0.5) * 0.6, v = (hsh(Math.floor(x * 7), Math.floor(y * 7), i + 9) - 0.5) * 0.5; L.push([S(x + u, y + v, 0), S(x + u + 0.14, y + v + 0.05, 0)]); }
        K.strokes(L, rgba('128,146,56', al * 0.8), Math.max(1, K.TW / 32)); break; }
      case 'branch': {   // ramo spezzato a terra con due foglie
        const p0 = S(x - 0.28, y + 0.08, 0.02), p1 = S(x + 0.02, y - 0.02, 0.02), p2 = S(x + 0.26, y + 0.1, 0.02), p3 = S(x + 0.1, y - 0.2, 0.02);
        g.strokeStyle = rgba('104,74,42', 0.35 + al * 0.65); g.lineWidth = Math.max(1.5, K.TW / 22); g.lineCap = 'round'; g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.lineTo(...p2); g.moveTo(...p1); g.lineTo(...p3); g.stroke();
        for (const [u, v] of [[0.12, -0.24], [0.28, 0.06]]) fill(a(8, 0.05, x + u, y + v, 1.6), rgba('92,140,56', 0.35 + al * 0.65));
        break; }
      case 'bark': for (const [u, v, r] of [[-0.18, 0.1, 0.06], [-0.04, 0.2, 0.045], [0.12, 0.14, 0.055], [0.22, 0.26, 0.04], [0.02, 0.3, 0.035]]) fill(a(8, r, x + u, y + v, 1.5), rgba('228,200,148', 0.35 + al * 0.65)); break;   // schegge di corteccia ai piedi dell'albero
      case 'bed': {   // buca larga dove si e' sdraiato: bordo di terra smossa e fondo scuro
        fill(a(20, 0.62, x, y, 1.35), rgba('128,104,66', 0.35 + al * 0.55));
        fill(a(20, 0.52, x, y, 1.35), rgba('82,62,38', 0.4 + al * 0.55));
        fill(a(18, 0.38, x + 0.03, y + 0.03, 1.35), rgba('62,46,28', 0.4 + al * 0.5));
        break; }
      case 'nap': fill(a(20, 0.6, x, y, 1.35), rgba('150,170,80', al * 0.5)); fill(a(18, 0.45, x, y, 1.35), rgba('110,130,52', al * 0.45)); break;
      case 'blood': for (const [u, v, r] of [[0, 0, 0.06], [0.1, 0.05, 0.04], [-0.07, 0.08, 0.03]]) fill(a(10, r, x + u, y + v, 1.3), al > 0.6 ? 'rgba(196,22,30,.95)' : rgba('112,20,20', 0.4 + al * 0.6)); break;
    }
  }

  // ======================= IL MAMMUT =======================
  function placeList(k) { const M = MP(), L = LM(); return (M.places[k] || []).map(([x, y], i) => ({ x: x + 0.5, y: y + 0.5, k, i, gl: k === 'drink' && i >= (M.n0 == null ? 1e9 : M.n0), gt: k === 'sleep' && !!(L.gtree && L.gtree.sp && L.gtree.sp[0] === x && L.gtree.sp[1] === y) })); }
  function feared(G, x, y) { return G.mm.fear.some(f => G.time - f.t < 160 && Math.hypot(f.x - x, f.y - y) < 12); }
  // il posto piu' vicino del tipo che gli serve (cosi' si puo' ragionare su dove andra'): evita i posti dove ha avuto paura, cambia rispetto all'ultimo
  // le sue abitudini (MP().fav, le raccontano le pitture): il pascolo preferito, dove beve (la radura ogni tanto: dopo esserci stato per un po' la evita), dove riposa
  function habit(G, p, k, rest) {
    const m = G.mm, fv = MP().fav || {};
    if (k === 'eat') return p.i === fv.eat ? -16 : 0;
    if (k === 'drink') return p.gl ? (G.time - (m.glT == null ? -1e9 : m.glT) > 150 ? (fv.drink === -1 ? -24 : -6) : 14) : p.i === fv.drink ? -16 : 0;
    if (k === 'sleep') return p.gt ? (fv.sleep === -1 ? (rest ? -30 : -18) : (rest ? -10 : 0)) : p.i === fv.sleep ? -14 : 0;
    return 0;
  }
  function choosePlace(G, k, rest) {
    const m = G.mm, L2 = placeList(k).filter(p => Math.hypot(p.x - m.x, p.y - m.y) > 3);
    let best = null, bs = 1e9;
    for (const p of L2) { const d = Math.hypot(p.x - m.x, p.y - m.y), s = d * (0.9 + Math.random() * 0.25) + habit(G, p, k, rest) + (feared(G, p.x, p.y) ? 60 : 0) + ((k === 'sleep' || k === 'rest') && atCamp(p.x, p.y, 18) ? 40 : 0) + (p.x === (m.last || {}).x && p.y === (m.last || {}).y ? 30 : 0); if (s < bs) { bs = s; best = p; } }
    return best;
  }
  function mmGo(G, x, y, max) { const m = G.mm, p = cqPath(m.x, m.y, x, y); m.path = max ? p.slice(0, max) : p; if (!m.path.length) m.path = []; }
  // la sua giornata: all'alba ha fame -> pascolo; dopo aver mangiato ha sete -> l'acqua piu' vicina; nelle ore calde riposa all'ombra;
  // il pomeriggio di nuovo pascolo e acqua; al tramonto cerca un posto riparato per dormire. In mezzo si gratta agli alberi e va a curiosare
  function mmPlan(G) {
    const m = G.mm, t = cyc(G);
    if (t >= DUSK + 6 && t < DAWN) { const p = m.sleepP && !feared(G, m.sleepP.x, m.sleepP.y) ? m.sleepP : choosePlace(G, 'sleep'); m.sleepP = p; m.tgt = p; m.st = 'walk'; if (p) mmGo(G, p.x, p.y); return; }
    m.sleepP = null;
    if (t >= HOT0 && t < HOT1 && m.restD !== dayN(G)) { const p = choosePlace(G, 'sleep', true); if (p) { m.tgt = { x: p.x, y: p.y, k: 'rest' }; m.st = 'walk'; mmGo(G, p.x, p.y); return; } }
    if (Math.max(m.need.e, m.need.w) < 0.3) {   // non ha bisogno di niente: si gratta a un albero li' vicino
      const tr = MP().trees.filter(o => !o.cut && Math.hypot(o.x - m.x, o.y - m.y) < 12 && Math.hypot(o.x - m.x, o.y - m.y) > 3);
      const o = tr.length ? tr[Math.floor(Math.random() * tr.length)] : null, sp = o && cqSpot(o.x, o.y);
      if (sp) { m.tgt = { x: sp.x, y: sp.y, k: 'rub', tr: o }; m.st = 'walk'; mmGo(G, sp.x, sp.y); return; }
    }
    const k = m.need.w > m.need.e ? 'drink' : 'eat';
    const p = choosePlace(G, k); m.tgt = p; m.st = 'walk'; if (p) mmGo(G, p.x, p.y);
  }
  // curiosita': un rumore lontano (ascia, urla, albero che cade) o una figura vista da lontano lo fanno avvicinare piano per guardare;
  // se e' gia' sospettoso invece si allontana da quella parte
  function mmNoise(G, x, y, k) { G.mmN.push({ x, y, k, t: G.time }); if (G.mmN.length > 8) G.mmN.shift(); }
  function mmCurious(G, x, y) {
    const m = G.mm; if (['trap', 'stuck', 'wind', 'charge', 'flee', 'sleep', 'cur', 'dead'].includes(m.st) || (m.curT || 0) > G.time) return;
    m.curT = G.time + 25;
    if (m.wary > G.time) { alarm(G, x, y); mmFleeFrom(G, x, y, 9); return; }
    m.st = 'cur'; m.cx = x; m.cy = y; m.cE = G.time + 7; const d = Math.hypot(x - m.x, y - m.y) || 1, ax = m.x + (x - m.x) / d * Math.min(3, d - 5), ay = m.y + (y - m.y) / d * Math.min(3, d - 5);
    if (d > 7 && cqCellFree(Math.floor(ax), Math.floor(ay))) mmGo(G, ax, ay, 5); else m.path = [];
    say(G, 'cur', { x: Math.round(x), y: Math.round(y) });
  }
  // scappa dalla parte opposta; le direzioni chiuse da un cacciatore vicino (entro 7 caselle, a meno di ~45 gradi) o da acqua e rocce non valgono:
  // se non resta nessuna via d'uscita e' BLOCCATO (circondato): per qualche secondo non scappa e le lance fanno male davvero
  function mmFleeFrom(G, sx, sy, far) {
    const m = G.mm; let best = null, bs = -1e9;
    const a0 = Math.atan2(m.y - sy, m.x - sx), hs = active(G).map(c => { const q = P(c); return [Math.atan2(q.y - m.y, q.x - m.x), Math.hypot(q.x - m.x, q.y - m.y)]; }).filter(h => h[1] < 7);
    for (const da of [0, 0.4, -0.4, 0.8, -0.8, 1.3, -1.3, 2, -2]) {
      const a = a0 + da, d = far || 12;
      if (hs.some(([ha]) => Math.abs(Math.atan2(Math.sin(a - ha), Math.cos(a - ha))) < 0.8)) continue;
      // i primi passi: se c'e' acqua o roccia subito davanti quella via e' chiusa
      let open = true; for (let s = 1.2; s <= 4.2 && open; s += 1) if (!cqCellFree(Math.floor(m.x + Math.cos(a) * s), Math.floor(m.y + Math.sin(a) * s))) open = false;
      if (!open) continue;
      const x = Math.floor(m.x + Math.cos(a) * d), y = Math.floor(m.y + Math.sin(a) * d);
      const q = cqCellFree(x, y) ? { x: x + 0.5, y: y + 0.5 } : null; if (!q) continue;
      const p = cqPath(m.x, m.y, q.x, q.y); if (!p.length || p.length > d * 1.8) continue;
      const s = -Math.abs(da) * 3 - p.length * 0.15; if (s > bs) { bs = s; best = p; }
    }
    if (!best && m.st !== 'stuck' && (m.stuckCd || 0) < G.time) { m.st = 'stuck'; m.stT = G.time + STUCK_T; m.stuckCd = G.time + STUCK_T + 12; m.path = []; m.walk = 0; m.aw = 1; trumpet(G, 1); say(G, 'stuck', {}); return; }
    m.path = best ? best.slice(0, 16) : []; m.st = 'flee'; m.fT = G.time; m.aw = 0.4;
  }
  // il cacciatore piu' vicino entro r (contro di lui carica quando esce dalla fossa o rompe l'accerchiamento)
  function nearestHunter(G, r) { const m = G.mm; let b = null, bd = r; for (const c of active(G)) { const d = dxy(c, m.x, m.y); if (d < bd && !torchOn(G, c)) { bd = d; b = c; } } return b; }
  function mmCharge(G, c) { const m = G.mm; m.st = 'wind'; m.wT = G.time; m.chTgt = c.id; m.path = []; trumpet(G, 1); say(G, 'wind', { a: c.id }); }
  function alarm(G, x, y) { const m = G.mm; m.wary = G.time + 120; m.fear.push({ x, y, t: G.time }); if (m.fear.length > 6) m.fear.shift(); }
  // barrito: da solo ogni 75-130 s (e si sente solo entro HEAR_T caselle)
  function trumpet(G, loud) { const m = G.mm; G.trump = { x: Math.round(m.x * 10) / 10, y: Math.round(m.y * 10) / 10, t: G.time, l: loud ? 1 : 0 }; m.trT = G.time + 75 + Math.random() * 55; G.kn = { x: m.x + (Math.random() - 0.5) * 8, y: m.y + (Math.random() - 0.5) * 8, t: G.time, fuzzy: 1 }; }
  // reazione quando si accorge dei cacciatori: scappa, oppure carica (se ferito o se chi lo affronta e' solo e vicino);
  // hit = colpito da una lancia: si rivolta anche contro chi tira da lontano, e piu' e' ferito piu' e' rabbioso
  function mmReact(G, th, hit) {
    const m = G.mm, q = P(th), d = Math.hypot(q.x - m.x, q.y - m.y), alone = !active(G).some(o => o !== th && dist2(o, th) < 4);
    alarm(G, q.x, q.y);
    const p = (m.hp < m.max ? 0.4 + 0.3 * (1 - m.hp / m.max) : 0.3) + (alone ? 0.2 : 0);
    if (!torchOn(G, th) && d < (hit ? 6.2 : CH_R + 0.8) && Math.random() < p) { mmCharge(G, th); return; }
    mmFleeFrom(G, q.x, q.y); if (m.st === 'flee' && Math.random() < 0.5) trumpet(G, 1);
  }
  const dist2 = (a, b) => { const p = P(a), q = P(b); return Math.hypot(p.x - q.x, p.y - q.y); };
  function mmTick(G, dt, warm) {
    const m = G.mm; if (!m || m.st === 'dead') return;
    const t = cyc(G), slow = 0.6 + 0.4 * m.hp / m.max;
    m.need.e = Math.min(1, m.need.e + dt / 110); m.need.w = Math.min(1, m.need.w + dt / (m.st === 'graze' ? 45 : 140));   // mangiare mette sete
    // ---- percezione: vista (meno di notte, poco mentre dorme) e fiuto col vento ----
    if (!warm && m.st !== 'trap' && m.st !== 'stuck' && m.st !== 'wind' && m.st !== 'charge') {
      const sleeping = m.st === 'sleep', vis = sleeping ? VIS_S : dark(G) > 0.5 ? VIS_N : VIS_D, wx = Math.cos(G.wind), wy = Math.sin(G.wind);
      let gain = 0, who = null, wd = 99;
      for (const c of active(G)) {
        const q = P(c), dx = m.x - q.x, dy = m.y - q.y, d = Math.hypot(dx, dy);
        if (torchOn(G, c) && d < PUSH_R && !sleeping && (m.st !== 'flee' || G.time - m.fT > 2)) { alarm(G, q.x, q.y); mmFleeFrom(G, q.x, q.y, 10); who = null; gain = 0; break; }   // il fuoco lo spinge via
        const v = vis * (m.wary > G.time ? 1.35 : 1) * (torchOn(G, c) ? 1.5 : 1) * (inMarsh(q.x, q.y) && !torchOn(G, c) ? 0.45 : 1);   // tra le canne non ti vede
        if (d < v) { gain += (0.45 + 1.7 * (1 - d / v)) * (sleeping ? 0.5 : 1); if (d < wd) { wd = d; who = c; } }
        if (d < SMELL && d > 0.5 && (dx * wx + dy * wy) / d > 0.6) { gain += 0.75; if (d < wd) { wd = d; who = c; } if ((m.snT || 0) < G.time) { m.snT = G.time + 6; m.sn = { id: c.id, t: G.time }; } }
      }
      if (!sleeping && !gain && m.st !== 'flee' && m.st !== 'cur') for (const c of active(G)) { const q = P(c), d = Math.hypot(m.x - q.x, m.y - q.y); if (d > vis && d < vis * 1.9 && !inMarsh(q.x, q.y) && (dark(G) < 0.5 || torchOn(G, c))) { mmCurious(G, q.x, q.y); break; } }
      if (!sleeping) for (const nz of G.mmN) { if (nz.used || G.time - nz.t > 2) continue; nz.used = 1; const d = Math.hypot(nz.x - m.x, nz.y - m.y); if (d < (nz.k === 'sh' ? 18 : nz.k === 'reed' ? 11 : 15) && d > (nz.k === 'reed' ? 3 : 6)) mmCurious(G, nz.x, nz.y); }
      if (m.st !== 'flee') m.aw = Math.max(0, Math.min(1.2, m.aw + (gain ? gain * (m.wary > G.time ? 1.5 : 1) : -0.3) * dt));
      if (m.aw >= 1 && who && m.st !== 'flee') { if (sleeping) say(G, 'wake', {}); mmReact(G, who); }
    }
    // ---- stati ----
    // dalla fossa o dall'accerchiamento esce infuriato: carica il cacciatore piu' vicino, se no scappa
    if (m.st === 'trap' || m.st === 'stuck') {
      m.path = []; m.walk = 0;
      const c = nearestHunter(G, 8);
      if (c) { const q = P(c); m.face = (q.x - m.x) - (q.y - m.y) > 0 ? 1 : -1; }
      if (G.time >= (m.st === 'trap' ? m.trapT : m.stT)) { say(G, m.st === 'trap' ? 'out' : 'free', {}); m.st = 'walk'; if (c) mmCharge(G, c); else { m.stuckCd = G.time + 10; mmFleeFrom(G, m.x - 1, m.y - 1); } }
    }
    else if (m.st === 'wind') { m.walk = 0; const c = byId(G, m.chTgt); if (c) { const q = P(c); m.face = (q.x - m.x) - (q.y - m.y) > 0 ? 1 : -1; } if (G.time - m.wT > 0.75) { const q = c ? P(c) : { x: m.x + 1, y: m.y }, d = Math.hypot(q.x - m.x, q.y - m.y) || 1; m.cd = [(q.x - m.x) / d, (q.y - m.y) / d]; m.st = 'charge'; m.cT = G.time; m.hit = []; } }
    else if (m.st === 'charge') {
      const sp = CQ_SPEED * 1.75 * dt, nx = m.x + m.cd[0] * sp, ny = m.y + m.cd[1] * sp;
      if (cqCellFree(Math.floor(nx), Math.floor(ny))) { m.x = nx; m.y = ny; } else m.cT = -99;
      m.walk += dt * 14; m.face = m.cd[0] - m.cd[1] > 0 ? 1 : -1;
      for (const c of active(G)) if (!m.hit.includes(c.id) && dxy(c, m.x, m.y) < 1.1 && !cqLagging(c)) { m.hit.push(c.id); knock(G, c, 'm'); }   // cqLagging: rete inceppata, qui sembra fermo
      if (G.time - m.cT > 1.3) { mmFleeFrom(G, m.x - m.cd[0], m.y - m.cd[1], 9); }
    }
    else if (m.st === 'flee') {
      const k = G.time - m.fT < 4 ? 1.25 : 0.8;
      if (m.path.length) cqModeStep(m, dt, k * slow); else { m.st = 'walk'; m.path = []; m.tgt = null; m.nT = G.time + 1; }
      if (G.time - m.fT > 9) { m.st = 'walk'; m.path = []; m.tgt = null; }
    }
    else if (m.st === 'sleep') { m.walk = 0; if (t >= DAWN || t < DUSK) { m.st = 'walk'; m.tgt = null; m.path = []; trumpet(G, 0); } }
    else if (m.st === 'graze') {
      m.need.e = Math.max(0, m.need.e - dt / 22);
      if ((m.gT -= dt) <= 0) { m.gT = 4 + Math.random() * 4; track(G, 'graze', m.x + (Math.random() - 0.5), m.y + (Math.random() - 0.5)); const a = Math.random() * 7, nx = m.x + Math.cos(a) * 1.5, ny = m.y + Math.sin(a) * 1.5; if (cqCellFree(Math.floor(nx), Math.floor(ny)) && MP().ter[Math.floor(ny)][Math.floor(nx)] === 2) m.path = [[nx, ny]]; }
      if (m.path.length) cqModeStep(m, dt, 0.25); else m.walk = 0;
      if (m.need.e <= 0.02 || isNight(G)) { m.st = 'walk'; m.tgt = null; m.path = []; if (Math.random() < 0.7) track(G, 'dung', m.x - 0.4, m.y + 0.3); }
    }
    else if (m.st === 'cur') {   // guarda verso il rumore con la proboscide alzata
      const dx = m.cx - m.x, dy = m.cy - m.y; m.face = dx - dy > 0 ? 1 : -1;
      if (m.path.length) cqModeStep(m, dt, 0.32); else m.walk = 0;
      if (G.time > m.cE) { m.st = 'walk'; m.tgt = null; m.path = []; }
    }
    else if (m.st === 'rest') { m.walk = 0; m.need.e = Math.max(0, m.need.e - dt / 300); if (G.time > m.rsE || cyc(G) >= HOT1 + 6) { m.st = 'walk'; m.tgt = null; m.path = []; } }
    else if (m.st === 'drink') { m.walk = 0; m.need.w = Math.max(0, m.need.w - dt / 8); if (m.need.w <= 0.02) { m.mudT = G.time + 35; m.st = 'walk'; m.tgt = null; m.path = []; } }
    else if (m.st === 'rub') { m.walk = 0; if (G.time > m.rT) { m.st = 'walk'; m.tgt = null; m.path = []; } }
    else {   // walk
      if (!m.tgt || (!m.path.length && m.tgt && Math.hypot(m.tgt.x - m.x, m.tgt.y - m.y) > 1.2 && (m.nT || 0) < G.time)) { m.nT = G.time + 2; mmPlan(G); }
      if (m.path.length) cqModeStep(m, dt, (m.wary > G.time ? 0.62 : 0.5) * slow);
      else if (m.tgt && Math.hypot(m.tgt.x - m.x, m.tgt.y - m.y) <= 1.2) {
        const k = m.tgt.k; m.last = m.tgt;
        if (k === 'sleep') { m.st = 'sleep'; track(G, 'bed', m.x, m.y); if (!warm) say(G, 'sleep', {}); }
        else if (k === 'rest') { m.st = 'rest'; m.restD = dayN(G); m.rsE = G.time + 18 + Math.random() * 8; track(G, 'nap', m.x, m.y); }
        else if (k === 'eat') { m.st = 'graze'; m.gT = 1; }
        else if (k === 'drink') { m.st = 'drink'; if (m.tgt.gl) m.glT = G.time; }
        else if (k === 'rub') { m.st = 'rub'; m.rT = G.time + 6 + Math.random() * 6; const o = m.tgt.tr; if (o) track(G, 'bark', o.x + 0.5, o.y + 0.5); }
        else m.tgt = null;
      }
    }
    // ---- impronte lungo la strada, rami spezzati tra gli alberi, sangue se e' ferito, sterco ogni tanto ----
    if (m.lx == null) { m.lx = m.x; m.ly = m.y; }
    const mv = Math.hypot(m.x - m.lx, m.y - m.ly);
    if (mv > 3.2) {   // un'impronta ogni 3 caselle circa (alternando i lati)
      const dx = (m.x - m.lx) / mv, dy = (m.y - m.ly) / mv, side = (m.side = -(m.side || 1)) * 0.22;
      track(G, m.mudT > G.time ? 'mud' : 'foot', m.x - dy * side, m.y + dx * side, dx, dy);
      if (m.hp < m.max) track(G, 'blood', m.x + (Math.random() - 0.5) * 0.6, m.y + (Math.random() - 0.5) * 0.6, dx, dy);
      if (MP().trees.some(o => !o.cut && Math.abs(o.x + 0.5 - m.x) < 1.6 && Math.abs(o.y + 0.5 - m.y) < 1.6) && Math.random() < 0.5) track(G, 'branch', m.x + dx * 0.5, m.y + dy * 0.5, dx, dy);
      if ((m.dT -= mv) <= 0) { m.dT = 30 + Math.random() * 30; track(G, 'dung', m.x - dx * 0.8, m.y - dy * 0.8); }
      m.lx = m.x; m.ly = m.y;
    }
    // trappola sul percorso: ci cade dentro
    if (m.st !== 'trap' && m.st !== 'dead') for (const p of G.traps) if (!p.used && Math.hypot(p.x - m.x, p.y - m.y) < 1.0) { p.used = 1; m.st = 'trap'; m.trapT = G.time + TRAP_T; m.x = p.x; m.y = p.y; m.path = []; m.aw = 1; alarm(G, p.x, p.y); trumpet(G, 1); if (!warm) say(G, 'trap', {}); break; }
    if (!warm && G.time >= (m.trT || 0) && m.st !== 'sleep') trumpet(G, 0);
  }
  // un cacciatore colpito (carica del mammut o sciacallo): a terra, lascia cadere quello che porta
  function knock(G, c, by) {
    if (!c.alive || c.dn) return;
    c.dn = G.time; c.rv = 0; c.op = null; c.path = [];
    if (c.mt >= 0) { const it = G.meat[c.mt]; if (it) { if (by === 'j') { it.st = 3; } else { it.st = 0; const q = P(c); it.x = q.x + 0.4; it.y = q.y + 0.3; } } c.mt = -1; }
    if (c.logs) c.logs = 0;
    if (c.rab && by === 'j') c.rab = 0;
    c.tor = 0;
    say(G, 'down', { a: c.id, b: by });
  }

  // ======================= AZIONI =======================
  function nearTree(c, r = 1.5) { const q = P(c); let b = -1, bd = r; MP().trees.forEach((t, i) => { if (t.cut || cqSolid[t.y][t.x] == null || cqSolid[t.y][t.x].prop !== 'tree') return; const d = Math.hypot(t.x + 0.5 - q.x, t.y + 0.5 - q.y); if (d < bd) { bd = d; b = i; } }); return b; }
  function digOk(G, x, y) { const cx = Math.floor(x), cy = Math.floor(y), t = MP().ter[cy] && MP().ter[cy][cx]; return (t === 1 || t === 2 || t === 3) && cqCellFree(cx, cy) && !atCamp(x, y, 7) && !G.traps.some(p => Math.hypot(p.x - x, p.y - y) < 3); }
  function digAt(G, c) { const q = P(c); return G.digs.find(d => Math.hypot(d.x - q.x, d.y - q.y) < 1.6); }
  // pulsante grande a destra: macella / torcia / taglia / scava (le lance e le urla hanno i loro pulsanti a sinistra)
  function action(G, c) {
    if (!c.alive || c.dn) return null;
    const q = P(c), m = G.mm;
    if (m && m.st === 'dead' && !G.butch && Math.hypot(q.x - m.x, q.y - m.y) < 2.2) return { k: 'butch', t: '🔪 Macella il mammut', on: true };
    if (atCamp(q.x, q.y, 2.4) && G.fuel > 0 && !torchOn(G, c)) return { k: 'torch', t: '🔥 Prendi una torcia', on: true };
    const L = LM();
    if (L.menhir && Math.hypot(q.x - L.menhir.x, q.y - L.menhir.y) < 1.7) { const w = Math.ceil((G.spyCd || 0) - G.time); return w > 0 ? { k: 'look', t: '🗿 Le pietre riposano (' + w + ' s)', on: false } : { k: 'look', t: '👁️ Guarda lontano dalle pietre', on: !c.op }; }
    if (L.paint && !c.bot && q.y > L.paint.y0 + 0.9 && q.y < L.paint.y0 + 3.2 && q.x > L.paint.x0 - 0.6 && q.x < L.paint.x0 + 7.6) return { k: 'paint', t: '🎨 Guarda le pitture', on: true };
    if (c.mt < 0 && (c.logs || 0) < LOGS_MAX) { const i = nearTree(c); if (i >= 0) return { k: 'chop', i, t: '🪓 Taglia legna (' + (c.logs || 0) + '/' + LOGS_MAX + ')', on: !c.op }; }
    if (c.mt < 0) { const d = digAt(G, c); if (d) return { k: 'dig', i: d.id, t: '⛏️ Scava insieme (' + Math.round(d.p * 100) + '%)', on: true }; if (digOk(G, q.x, q.y)) return { k: 'dig', i: -1, t: '⛏️ Scava una fossa', on: true }; }
    return null;
  }
  function doAct(G, c, a) {
    if (!c.alive || c.dn || !a) return;
    const q = P(c);
    if (a.k === 'butch') { const m = G.mm; if (m && m.st === 'dead' && !G.butch && Math.hypot(q.x - m.x, q.y - m.y) < 2.4) c.op = { k: 'butch', t0: G.time, x: q.x, y: q.y }; return; }
    if (a.k === 'torch') { if (atCamp(q.x, q.y, 2.8) && G.fuel > 0) { c.tor = G.time + TORCH_T; say(G, 'torch', { a: c.id }); } return; }
    if (a.k === 'look') { const L = LM(); if (L.menhir && Math.hypot(q.x - L.menhir.x, q.y - L.menhir.y) < 2 && (G.spyCd || 0) <= G.time) c.op = { k: 'look', t0: G.time, x: q.x, y: q.y }; return; }
    if (a.k === 'chop') { const i = a.i != null && a.i >= 0 ? a.i : nearTree(c); if (i >= 0 && !G.cut[i] && (c.logs || 0) < LOGS_MAX) c.op = { k: 'chop', i, t0: G.time, x: q.x, y: q.y }; return; }
    if (a.k === 'dig') {
      let d = digAt(G, c);
      if (!d) { if (!digOk(G, q.x, q.y)) return; d = { id: ++G.dgN, x: Math.floor(q.x) + 0.5, y: Math.floor(q.y) + 0.5, p: 0 }; G.digs.push(d); }
      c.op = { k: 'dig', i: d.id, t0: G.time, x: q.x, y: q.y }; return;
    }
  }
  // lancia: al mammut (se lo vedo e e' a tiro) o allo sciacallo piu' vicino
  function throwTarget(G, c) {
    const q = P(c), m = G.mm; let best = null, bd = 1e9;
    if (G.jk) for (const j of G.jk) { const d = Math.hypot(j.x - q.x, j.y - q.y); if (d < 4.5 && d < bd && canSee(G, c, j.x, j.y)) { bd = d; best = { k: 'j', id: j.id, x: j.x, y: j.y, d }; } }
    if (best && best.d < 3) return best;
    if (m && m.st !== 'dead') { const d = Math.hypot(m.x - q.x, m.y - q.y); if (d < THROW_R && canSee(G, c, m.x, m.y)) return { k: 'm', id: 'm', x: m.x, y: m.y, d }; }
    return best;
  }
  function canSee(G, c, x, y) {
    const q = P(c), d = Math.hypot(q.x - x, q.y - y); if (dark(G) < 0.5) return d < viewD(G);
    if (d < (torchOn(G, c) ? TORCH_L : SEE_N)) return true;
    if (inFire(G, x, y) && d < 10) return true;
    return active(G).some(o => o !== c && torchOn(G, o) && dxy(o, x, y) < TORCH_L * 0.85) && d < 9;
  }
  function doThrow(G, c, tid) {
    if (!c.alive || c.dn || (c.sp || 0) <= 0 || (c.thT || 0) > G.time) return;
    const tg = throwTarget(G, c); if (!tg || (tid != null && String(tg.id) !== String(tid) && tid !== 'any')) { if (!tg) return; }
    c.sp--; c.thT = G.time + 1.1;
    const q = P(c), m = G.mm;
    let hit = false;
    // fermo nella fossa o circondato: sempre; mentre dorme quasi sempre; se cammina o scappa e' molto piu' difficile
    if (tg.k === 'm') { const mv = m.st === 'flee' || m.st === 'charge' ? 0.55 : m.st === 'walk' || m.st === 'cur' ? 0.78 : 1, p = m.st === 'trap' || m.st === 'stuck' ? 1 : m.st === 'sleep' ? 0.97 : Math.min(0.94, 0.94 - Math.max(0, tg.d - 2.5) * 0.12) * mv; hit = Math.random() < p; }
    else hit = Math.random() < Math.min(0.9, 0.95 - tg.d * 0.08);
    const lx = tg.x + (hit ? (Math.random() - 0.5) * 0.8 : (tg.x - q.x) / tg.d * (1 + Math.random()) + (Math.random() - 0.5) * 1.4), ly = tg.y + (hit ? (Math.random() - 0.5) * 0.8 : (tg.y - q.y) / tg.d * (1 + Math.random()) + (Math.random() - 0.5) * 1.4);
    const sp = { id: ++G.spN, x: lx, y: ly }; const cx = Math.floor(lx), cy = Math.floor(ly);
    if (!cqCellFree(cx, cy)) { const s = cqSpot(cx, cy); if (s) { sp.x = s.x; sp.y = s.y; } }
    G.sp.push(sp); G.fly.push([Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10, Math.round(tg.x * 10) / 10, Math.round(tg.y * 10) / 10, G.time]);
    if (tg.k === 'j') { if (hit) { G.jk = G.jk.filter(j => j.id !== tg.id); c.jkK = (c.jkK || 0) + 1; say(G, 'jk', { a: c.id }); } else say(G, 'miss', { a: c.id, j: 1 }); return; }
    if (!hit) { say(G, 'miss', { a: c.id }); m.aw = Math.max(m.aw, 0.8); return; }
    // le lance da sole lo feriscono soltanto (non scende sotto FLOOR): il colpo che lo abbatte si da' nella fossa o quando e' circondato
    const open = m.st === 'trap' || m.st === 'stuck', fl = mmFloor(m);
    c.hits = (c.hits || 0) + 1; G.kn = { x: m.x, y: m.y, t: G.time };
    if (open) m.hp -= 2; else if (m.hp > fl) m.hp -= 1;
    if (m.hp <= 0) { m.hp = 0; m.st = 'dead'; m.path = []; m.walk = 0; G.killT = G.time; say(G, 'kill', { a: c.id }); return; }
    say(G, 'hit', { a: c.id, d: m.hp, fl: !open && m.hp <= fl ? 1 : 0 });
    if (open) return;
    m.aw = 1; if (m.st !== 'wind' && m.st !== 'charge') mmReact(G, c, 1);
  }
  // sotto questa vita le lance non lo feriscono piu': serve la fossa o circondarlo
  function mmFloor(m) { return Math.max(2, Math.round(m.max * FLOOR_K)); }
  function doShout(G, c) {
    if (!c.alive || c.dn || (c.shT || 0) > G.time) return;
    c.shT = G.time + SHOUT_CD; const q = P(c), m = G.mm;
    G.shouts.push([Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10, G.time, c.id]);
    mmNoise(G, q.x, q.y, 'sh');
    if (m && m.st !== 'dead' && m.st !== 'trap' && m.st !== 'stuck' && m.st !== 'charge' && m.st !== 'wind' && Math.hypot(m.x - q.x, m.y - q.y) < SHOUT_R) { alarm(G, q.x, q.y); mmFleeFrom(G, q.x, q.y, 11); }
    for (const j of G.jk) if (Math.hypot(j.x - q.x, j.y - q.y) < SHOUT_R) { j.fear = G.time + 5; j.fx = q.x; j.fy = q.y; }
  }

  // ======================= CONIGLI E SCIACALLI =======================
  function rabTick(G, dt) {
    const B = MP().burrows, day = dark(G) < 0.3;
    if (day && G.rab.length < Math.min(7, 3 + Math.floor(G.chars.length / 2)) && (G.rabT -= dt) <= 0) {
      G.rabT = 5 + Math.random() * 4; const b = B[Math.floor(Math.random() * B.length)];
      if (b && !active(G).some(c => dxy(c, b.x, b.y) < 5)) G.rab.push({ id: ++G.rbN, x: b.x, y: b.y, b: B.indexOf(b), st: 'idle', t: 0, path: [], face: 1, walk: 0 });
    }
    for (const r of G.rab.slice()) {
      const b = B[r.b], th = active(G).filter(c => dxy(c, r.x, r.y) < 3.2).sort((a, c) => dxy(a, r.x, r.y) - dxy(c, r.x, r.y))[0];
      if (!day && Math.hypot(r.x - b.x, r.y - b.y) < 0.6) { G.rab = G.rab.filter(o => o !== r); continue; }
      if (th && r.st !== 'run') {
        const q = P(th); let tx = r.x + (r.x - q.x) * 2, ty = r.y + (r.y - q.y) * 2;
        if (Math.hypot(b.x - r.x, b.y - r.y) < 6 && ((b.x - r.x) * (r.x - q.x) + (b.y - r.y) * (r.y - q.y)) > 0) { tx = b.x; ty = b.y; }   // la tana e' dalla parte giusta: ci scappa dentro
        const cx = Math.floor(tx), cy = Math.floor(ty); if (cqCellFree(cx, cy)) { r.path = cqPath(r.x, r.y, cx + 0.5, cy + 0.5).slice(0, 4); r.st = 'run'; r.t = G.time + 1.3; }
      }
      if (r.st === 'run' && G.time > r.t) { r.st = 'rest'; r.t = G.time + 0.55; r.path = []; }
      else if (r.st === 'rest' && G.time > r.t) r.st = 'idle';
      else if (r.st === 'idle' && !r.path.length && Math.random() < dt * 0.4) { const a = Math.random() * 7, x = Math.floor(b.x + Math.cos(a) * 2.5), y = Math.floor(b.y + Math.sin(a) * 2.5); if (cqCellFree(x, y)) r.path = [[x + 0.5, y + 0.5]]; }
      if (!day && !r.path.length) r.path = [[b.x, b.y]];
      if (r.path.length) cqModeStep(r, dt, r.st === 'run' ? 1.3 : 0.45); else r.walk = 0;
      if (r.st === 'run' && Math.hypot(r.x - b.x, r.y - b.y) < 0.5) { G.rab = G.rab.filter(o => o !== r); continue; }   // al sicuro nella tana
      // preso: chi lo tocca (il computer ci riesce solo a volte: e' agile)
      const cat = active(G).find(c => (c.rab || 0) < RAB_MAX && c.mt < 0 && dxy(c, r.x, r.y) < (c.bot ? 0.55 : 0.62) && (!c.bot || Math.random() < dt * 3));
      if (cat) { cat.rab = (cat.rab || 0) + 1; cat.rbK = (cat.rbK || 0) + 1; G.rab = G.rab.filter(o => o !== r); say(G, 'rab', { a: cat.id }); }
    }
  }
  function jkSpawn(G) {
    const k = dayN(G), n = Math.min(12, 3 * k + Math.floor(G.chars.length / 3)), F = fireC();
    for (let i = 0; i < n; i++) { for (let t = 0; t < 60; t++) { const f = cqModeFree(40); if (f && Math.hypot(f.x - F.x, f.y - F.y) > 16) { G.jk.push({ id: ++G.jkN, x: f.x, y: f.y, path: [], face: 1, walk: 0, cd: 0, fear: 0, tk: 0, ang: Math.random() * 7 }); break; } } }
    say(G, 'night', { d: k, v: n, of: NN(G) });
  }
  function jkTick(G, dt) {
    const F = fireC(), fr = fireR(G), t = cyc(G);
    if (t >= DAWN + 4 || t < NIGHT - 5) { if (G.jk.length) { G.jk = []; } return; }
    for (const j of G.jk) {
      if ((j.tk -= dt) <= 0) {
        j.tk = 0.35 + Math.random() * 0.2; j.tg = null;
        if (j.fear > G.time) { const a = Math.atan2(j.y - j.fy, j.x - j.fx), x = Math.floor(j.x + Math.cos(a) * 6), y = Math.floor(j.y + Math.sin(a) * 6); if (cqCellFree(x, y)) j.path = cqPath(j.x, j.y, x + 0.5, y + 0.5).slice(0, 6); }
        else if (j.cd > G.time) { const a = Math.atan2(j.y - F.y, j.x - F.x), x = Math.floor(F.x + Math.cos(a) * (fr + 7)), y = Math.floor(F.y + Math.sin(a) * (fr + 7)); if (cqCellFree(x, y)) j.path = cqPath(j.x, j.y, x + 0.5, y + 0.5).slice(0, 8); }
        else {
          // bersagli: chi porta la carne, la carcassa (se non e' ancora macellata), chi e' solo fuori dalla luce, le scorte se il fuoco e' basso
          let best = null, bs = 1e9;
          for (const c of active(G)) { const q = P(c); if (safe(G, q.x, q.y)) continue; const d = Math.hypot(q.x - j.x, q.y - j.y), alone = !active(G).some(o => o !== c && dist2(o, c) < 3); const s = d - (c.mt >= 0 ? 8 : 0) - (alone ? 3 : 0) + (torchOn(G, c) ? 4 : 0); if (d < 18 && s < bs) { bs = s; best = { c, x: q.x, y: q.y }; } }
          const m = G.mm; if (m && m.st === 'dead' && !G.butch && m.meat > 0) { const d = Math.hypot(m.x - j.x, m.y - j.y); if (d - 4 < bs && d < 26) { bs = d - 4; best = { car: 1, x: m.x, y: m.y }; } }
          for (const it of G.meat) if (it.st === 0) { const d = Math.hypot(it.x - j.x, it.y - j.y); if (d - 5 < bs && d < 22 && !safe(G, it.x, it.y)) { bs = d - 5; best = { it, x: it.x, y: it.y }; } }
          if (G.fuel < 30 && G.food > 0) { const d = Math.hypot(F.x - j.x, F.y - j.y); if (d - 6 < bs) { bs = d - 6; best = { stash: 1, x: F.x + 2, y: F.y }; } }
          j.tg = best;
          if (best) { const cx = Math.floor(best.x), cy = Math.floor(best.y); const p = cqPath(j.x, j.y, cqCellFree(cx, cy) ? cx + 0.5 : best.x, cqCellFree(cx, cy) ? cy + 0.5 : best.y); j.path = p.slice(0, 10); }
          else { j.ang += 0.6; const R = fr + 6 + Math.random() * 3, x = Math.floor(F.x + Math.cos(j.ang) * R), y = Math.floor(F.y + Math.sin(j.ang) * R); if (cqCellFree(x, y)) j.path = cqPath(j.x, j.y, x + 0.5, y + 0.5).slice(0, 8); }
        }
      }
      // non entrano nella luce del fuoco; stanno lontani dalle torce (se sono pochi)
      if (j.path.length) cqModeStep(j, dt, j.fear > G.time ? 1.2 : 1.04); else j.walk = 0;
      { const cr = coreR(G) + 0.25; if (cr > 0.25 && Math.hypot(j.x - F.x, j.y - F.y) < cr) { const a = Math.atan2(j.y - F.y, j.x - F.x); j.x = F.x + Math.cos(a) * cr; j.y = F.y + Math.sin(a) * cr; j.path = []; } }
      for (const [rx, ry, rr] of refC()) if (Math.hypot(j.x - rx, j.y - ry) < rr) { const a = Math.atan2(j.y - ry, j.x - rx), nx = rx + Math.cos(a) * (rr + 0.05), ny = ry + Math.sin(a) * (rr + 0.05); if (cqCellFree(Math.floor(nx), Math.floor(ny))) { j.x = nx; j.y = ny; } j.path = []; }
      if (j.cd > G.time || j.fear > G.time) continue;
      const pack = G.jk.filter(o => Math.hypot(o.x - j.x, o.y - j.y) < 2.5).length;
      for (const c of active(G)) {
        const q = P(c), d = Math.hypot(q.x - j.x, q.y - j.y); if (d > 0.75 || safe(G, q.x, q.y) || cqLagging(c)) continue;   // cqLagging: rete inceppata, qui sembra fermo
        if (torchOn(G, c) && pack < 2) { j.fear = G.time + 3; j.fx = q.x; j.fy = q.y; break; }
        knock(G, c, 'j'); j.cd = G.time + 9; break;
      }
      if (j.tg && j.tg.car && Math.hypot(j.x - j.tg.x, j.y - j.tg.y) < 1.6 && G.mm.meat > 0 && (j.eat = (j.eat || 0) + dt) > 10) { j.eat = 0; G.mm.meat--; say(G, 'eatc', { v: G.mm.meat }); }
      if (j.tg && j.tg.it && j.tg.it.st === 0 && Math.hypot(j.x - j.tg.it.x, j.y - j.tg.it.y) < 0.7) { j.tg.it.st = 3; j.cd = G.time + 12; say(G, 'stolem', {}); }
      if (j.tg && j.tg.stash && Math.hypot(j.x - j.tg.x, j.y - j.tg.y) < 1 && G.food > 0 && G.fuel < 30) { G.food--; j.cd = G.time + 10; say(G, 'stoler', { v: G.food }); }
    }
  }

  // ======================= CRONACA (stessa su ogni telefono) =======================
  function say(G, k, o) { if (G.guest) return; const e = Object.assign({ n: ++G.lgN, k }, o); G.lg.push(e); if (G.lg.length > 14) G.lg.shift(); show(G, e); }
  function show(G, e) {
    const me = G.me, a = e.a != null ? byId(G, e.a) : null, who = a ? (a === me ? 'Hai' : '<b>' + esc(a.name) + '</b> ha') : '';
    const T = h => cqToast(h);
    switch (e.k) {
      case 'hit': T('🎯 ' + who + ' colpito il mammut! ' + (e.fl ? 'È ferito, ma le lance da sole non bastano: spingetelo nella FOSSA o CIRCONDATELO!' : e.d <= 2 ? 'È allo stremo!' : 'Sanguina: seguite il sangue.')); beep(300, 0.1, 0.05); beep(220, 0.25, 0.05, 0.1); break;
      case 'miss': if (a === me) T(e.j ? '🎯 Mancato lo sciacallo!' : '🎯 Mancato! Raccogli la lancia da terra.'); beep(500, 0.05, 0.02); break;
      case 'jk': T('🐺 ' + who + ' trafitto uno sciacallo!'); beep(700, 0.08, 0.04); break;
      case 'kill': T('🦣 ' + who + ' abbattuto il MAMMUT! Macellatelo e portate la carne al fuoco: ne bastano ' + MEAT_NEED + ' pezzi.'); beep(392, 0.2, 0.06); beep(523, 0.2, 0.06, 0.2); beep(659, 0.4, 0.06, 0.4); break;
      case 'wind': if (a === me) T('🦣 Il mammut sta per CARICARTI! Spostati di lato!'); trumpetSnd(G, 1); break;
      case 'down': { const by = e.b === 'm' ? 'travolto dal mammut' : 'azzannato da uno sciacallo'; T(a === me ? '🤕 Sei stato ' + by + '! Resta giù: un compagno può rialzarti.' : '🤕 <b>' + esc(a.name) + '</b> è stato ' + by + '! Correte a rialzarlo!'); beep(160, 0.3, 0.06); break; }
      case 'up': { const b = byId(G, e.b); T(a === me ? '🤝 <b>' + esc(b ? b.name : '') + '</b> ti ha rialzato!' : '🤝 <b>' + esc(a.name) + '</b> è di nuovo in piedi.'); beep(660, 0.12, 0.04); break; }
      case 'ghost': T(a === me ? '👻 Nessuno è arrivato in tempo… ora guardi la caccia.' : '👻 <b>' + esc(a.name) + '</b> non ce l\'ha fatta.'); break;
      case 'butch': T('🔪 Mammut macellato: ' + e.v + ' pezzi di carne. Un pezzo a testa, al fuoco del campo!'); break;
      case 'home': T('🍖 ' + who + ' portato la carne al fuoco! (' + e.v + '/' + MEAT_NEED + ')'); beep(523, 0.1, 0.04); beep(784, 0.15, 0.04, 0.1); break;
      case 'stolem': T('🐺 Uno sciacallo ha portato via un pezzo di carne!'); break;
      case 'stoler': T('🐺 Gli sciacalli hanno rubato un coniglio dalle scorte! Il fuoco è troppo basso.'); break;
      case 'eatc': T('🐺 Gli sciacalli divorano la carcassa! (restano ' + e.v + ' pezzi)'); break;
      case 'trap': T('🕳️ Il mammut è caduto nella FOSSA! Per qualche secondo non può scappare: colpitelo!'); trumpetSnd(G, 1); break;
      case 'out': T('🦣 Il mammut è uscito dalla fossa, furioso!'); break;
      case 'stuck': T('🦣 Il mammut è CIRCONDATO: non ha vie di fuga! Colpitelo adesso, prima che sfondi!'); trumpetSnd(G, 1); break;
      case 'free': T('🦣 Il mammut sfonda l\'accerchiamento!'); break;
      case 'dig': T('🕳️ Fossa pronta! Ora spingete il mammut fin lì (con le urla o le torce).'); break;
      case 'rab': if (a === me) T('🐇 Preso un coniglio! Portalo al fuoco.'); beep(880, 0.06, 0.03); break;
      case 'torch': if (a === me) T('🔥 Torcia accesa: illumina di notte, tiene lontani gli sciacalli e spinge via il mammut.'); break;
      case 'wake': T('🦣 Il mammut si è svegliato!'); break;
      case 'sleep': break;
      case 'night': T('🌙 Notte ' + e.d + ' di ' + e.of + ': ' + e.v + ' sciacalli nel buio. State vicino alle fiamme, e il fuoco divora la legna: qualcuno dovrà uscire a prenderla.'); [520, 580, 640, 600, 520].forEach((f, i) => beep(f, 0.22, 0.02, i * 0.16)); break;
      case 'meal': T('🍖 Cena al fuoco: ' + (e.h ? e.h + ' senza coniglio: affamati, domani più lenti (chi salta due cene è sfinito).' : 'tutti hanno mangiato.')); break;
      case 'dawn': T('🌅 È l\'alba del giorno ' + e.d + '.' + (e.last ? ' Ultimo giorno: stanotte il mammut migra!' : '')); break;
      case 'fire': T('🔥 Il fuoco si è spento! Gli sciacalli arrivano al campo: serve legna, presto!'); beep(200, 0.3, 0.05); break;
      case 'spy': T('👁️ ' + who + ' guardato lontano dal cerchio di pietre: il mammut è sulla mappa per qualche secondo!'); if (a === me) G.big = 1; beep(880, 0.15, 0.04); beep(1175, 0.25, 0.04, 0.15); break;
      case 'smell': break;
      case 'cur': break;
    }
  }
  function trumpetSnd(G, loud) { const v = loud ? 0.06 : 0.035; beep(150, 0.25, v); beep(196, 0.35, v, 0.18); beep(247, 0.5, v, 0.42); }

  // ======================= PERSONAGGI DEL COMPUTER =======================
  function go(G, c, x, y, max) { const p = cqPath(c.x, c.y, x, y); c.path = max ? p.slice(0, max) : p; if (!c.path.length && Math.hypot(x - c.x, y - c.y) < 1.5) c.path = [[x, y]]; }
  function bot(G, c) {
    const F = fireC(), t = cyc(G), m = G.mm, night = dark(G) > 0.4, q = { x: c.x, y: c.y };
    // compagno a terra vicino: lo si rialza
    const dn = G.chars.filter(o => o.alive && o.dn && dist2(o, c) < 22).sort((a, b) => dist2(a, c) - dist2(b, c))[0];
    if (dn && !G.chars.some(o => o !== c && o.bot && o.helpT === dn.id && dist2(o, dn) < dist2(c, dn))) { c.helpT = dn.id; const p = P(dn); go(G, c, p.x, p.y); return; }
    c.helpT = null;
    // carica in arrivo: via di lato
    if (m && (m.st === 'wind' || m.st === 'charge') && Math.hypot(m.x - c.x, m.y - c.y) < 5) { const a = Math.atan2(c.y - m.y, c.x - m.x) + (c.id % 2 ? 1.2 : -1.2), x = Math.floor(c.x + Math.cos(a) * 3), y = Math.floor(c.y + Math.sin(a) * 3); if (cqCellFree(x, y)) go(G, c, x + 0.5, y + 0.5); return; }
    // carne: macellare, prendere, portare
    if (c.mt >= 0) { go(G, c, F.x + 0.5, F.y + 1); return; }
    if (m && m.st === 'dead') {
      if (!G.butch) { if (Math.hypot(m.x - c.x, m.y - c.y) < 2) { if (!c.op) doAct(G, c, { k: 'butch' }); c.path = []; } else go(G, c, m.x, m.y); return; }
      const it = G.meat.filter(i => i.st === 0 && !G.chars.some(o => o !== c && o.bot && o.mtT === i.id)).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
      if (it && (c.logs || 0) === 0) { c.mtT = it.id; go(G, c, it.x, it.y); return; }
    }
    // di notte: al fuoco (con la legna se ne ha); i cacciatori col mammut che dorme vicino ci provano con la torcia
    const toDusk = DUSK - t, campD = Math.hypot(F.x - c.x, F.y - c.y);
    if (night || (toDusk < campD / 1.6 + 12 && toDusk > -40 && t < DAWN)) {
      if (c.role === 'h' && night && m && m.st === 'sleep' && G.kn && G.time - G.kn.t < 120 && !G.kn.fuzzy && (c.sp || 0) > 0 && dayN(G) >= 2 && torchOn(G, c)) { if (Math.hypot(m.x - c.x, m.y - c.y) > 4) go(G, c, m.x, m.y, 10); else if (Math.random() < 0.6) doThrow(G, c); return; }
      if ((c.logs || 0) < 2 && !night) { const i = nearTree(c, 9); if (i >= 0 && toDusk > 6) return chop(G, c, i); }
      // il fuoco sta morendo e nessuno ha legna: uno solo esce al buio (con la torcia se puo') e torna con due tronchi
      const anyLogs = G.chars.some(o => o.alive && !o.dn && (o.logs || 0) > 0 && atCamp(o.x, o.y, 4));
      if (night && (c.wood || (G.fuel < 26 && !anyLogs && !G.chars.some(o => o !== c && o.bot && o.wood && o.alive && !o.dn)))) {
        if ((c.logs || 0) >= 2 || (G.fuel <= 0 && (c.logs || 0) >= 1)) { c.wood = 0; go(G, c, F.x + 0.5, F.y + 1); return; }
        c.wood = 1; if (!torchOn(G, c) && campD < 2.6 && G.fuel > 0) doAct(G, c, { k: 'torch' });
        const i = nearTree(c, 30); if (i >= 0) return chop(G, c, i);
      }
      if (campD > 1.8) { const a = c.id * 1.7, x = F.x + Math.cos(a) * 1.6, y = F.y + Math.sin(a) * 1.6; go(G, c, x, y); } else { c.path = []; if (night && !torchOn(G, c) && (c.sp || 0) > 0 && Math.random() < 0.1) doAct(G, c, { k: 'torch' }); }
      return;
    }
    // senza lance: si raccolgono (o alla rastrelliera del campo)
    if ((c.sp || 0) === 0) {
      const sp = G.sp.slice().sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
      if (sp && Math.hypot(sp.x - c.x, sp.y - c.y) < 16) { go(G, c, sp.x, sp.y); return; }
      go(G, c, F.x + 2, F.y + 1); return;
    }
    // raccoglitori: legna e conigli
    if (c.role === 'g') {
      const wants = G.fuel < FUEL_MAX - LOG_FUEL * 0.5;   // il fuoco prende legna (se no la si tiene in mano per la notte)
      if (((c.logs || 0) >= LOGS_MAX && wants) || ((c.logs || 0) > 0 && G.fuel < 30) || (c.rab || 0) >= RAB_MAX || ((c.rab || 0) > 0 && t > DUSK - 40)) { go(G, c, F.x + 1, F.y); return; }
      if ((c.logs || 0) < LOGS_MAX && (G.food >= G.chars.filter(o => o.alive).length || c.id % 2 || (c.logs || 0) > 0)) { const i = nearTree(c, 30); if (i >= 0) return chop(G, c, i); }
      const r = G.rab.slice().sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
      if (r) { go(G, c, r.x, r.y, 6); return; }
      const b = MP().burrows[(c.id + Math.floor(G.time / 30)) % MP().burrows.length]; go(G, c, b.x, b.y, 12); return;
    }
    // cacciatori: se sanno dov'e' il mammut ci vanno (a tiro di lancia), altrimenti seguono le tracce piu' fresche
    if (m && m.st !== 'dead' && G.kn && G.time - G.kn.t < 40) {
      const d = Math.hypot(m.x - c.x, m.y - c.y), seeIt = canSee(G, c, m.x, m.y);
      if (seeIt) {
        const open = m.st === 'trap' || m.st === 'stuck', weak = m.hp <= mmFloor(m);
        if (open && d < THROW_R - 0.3) { c.path = []; if (Math.random() < 0.7) doThrow(G, c); return; }
        if (open) { go(G, c, m.x, m.y, 6); return; }
        const H = G.chars.filter(o => o.bot && o.alive && !o.dn && o.role === 'h').sort((a, b) => a.id - b.id), i = Math.max(0, H.indexOf(c)), n = Math.max(1, H.length);
        // fossa pronta vicino: il primo va dietro al mammut (dalla parte opposta alla fossa) e urla, gli altri aspettano ai lati della fossa
        const tp = G.traps.filter(p => !p.used && Math.hypot(p.x - m.x, p.y - m.y) < 16).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0];
        if (tp) {
          const dd = Math.hypot(m.x - tp.x, m.y - tp.y) || 1, ux = (m.x - tp.x) / dd, uy = (m.y - tp.y) / dd;
          if (i === 0) { const x = m.x + ux * 3.5, y = m.y + uy * 3.5; if (Math.hypot(x - c.x, y - c.y) < 1.6) { c.path = []; doShout(G, c); } else go(G, c, x, y, 8); return; }
          const s = i % 2 ? 1 : -1, x = tp.x - uy * 3 * s, y = tp.y + ux * 3 * s; go(G, c, x, y, 10); return;
        }
        // ferito al massimo (le lance non bastano piu') o tranquillo che pascola: due cacciatori scavano una fossa a qualche passo da lui
        if ((weak || m.st === 'graze' || m.st === 'rest') && i < 2 && n >= 2 && !G.digs.length) {
          const ax = H.reduce((s, o) => s + o.x, 0) / n, ay = H.reduce((s, o) => s + o.y, 0) / n, dd = Math.hypot(m.x - ax, m.y - ay) || 1;
          if (!c.dgP) { for (let k = 0; k < 6 && !c.dgP; k++) { const a = Math.atan2(m.y - ay, m.x - ax) + (k - 2.5) * 0.4, x = Math.floor(m.x + Math.cos(a) * 6) + 0.5, y = Math.floor(m.y + Math.sin(a) * 6) + 0.5; if (digOk(G, x, y)) c.dgP = { x, y }; } const o = H[1 - i]; if (o && c.dgP) o.dgP = c.dgP; }
        }
        if (c.dgP && !G.traps.some(p => Math.hypot(p.x - c.dgP.x, p.y - c.dgP.y) < 1)) {
          if (Math.hypot(c.dgP.x - c.x, c.dgP.y - c.y) < 0.9) { c.path = []; if (!c.op) doAct(G, c, { k: 'dig' }); } else go(G, c, c.dgP.x, c.dgP.y, 10);
          return;
        }
        c.dgP = null;
        // se no lo circondano: ognuno al suo posto intorno (angoli diversi), e chi e' a tiro lo ferisce finche' le lance servono
        if (!weak && d < THROW_R - 0.3 && Math.random() < 0.45) { c.path = []; doThrow(G, c); return; }
        const a0 = (G.ringA == null ? (G.ringA = Math.random() * 7) : G.ringA), a = a0 + i / n * Math.PI * 2, x = m.x + Math.cos(a) * 4.4, y = m.y + Math.sin(a) * 4.4;
        go(G, c, x, y, 8); return;
      }
      go(G, c, G.kn.x, G.kn.y, 14); return;
    }
    { const L = LM(), dM = L.menhir ? Math.hypot(L.menhir.x - c.x, L.menhir.y - c.y) : 99;   // vedetta: se da tanto non si sa niente del mammut
      if (dM < 28 && (G.spyCd || 0) <= G.time && (!G.kn || G.time - G.kn.t > 80) && !G.chars.some(o => o !== c && o.bot && o.goM && o.alive)) { c.goM = 1; if (dM < 1.4) { c.path = []; doAct(G, c, { k: 'look' }); } else go(G, c, L.menhir.x, L.menhir.y); return; }
      c.goM = 0; }
    const tr = G.tr.filter(o => G.time - o.t < 160 && Math.hypot(o.x - c.x, o.y - c.y) < 14 && o.id > (c.trS || 0)).sort((a, b) => b.t - a.t)[0];
    if (tr) { c.trS = tr.id; const x = tr.x + (tr.dx || 0) * 4, y = tr.y + (tr.dy || 0) * 4, cx = Math.floor(x), cy = Math.floor(y); go(G, c, cqCellFree(cx, cy) ? cx + 0.5 : tr.x, cqCellFree(cx, cy) ? cy + 0.5 : tr.y, 12); return; }
    if (!c.path.length) { const L2 = placeList(['eat', 'drink', 'sleep'][Math.floor(Math.random() * 3)]); const p = L2[Math.floor(Math.random() * L2.length)]; if (p) go(G, c, p.x, p.y, 16); }
  }
  function chop(G, c, i) { const t = MP().trees[i], sp = cqSpot(t.x, t.y); if (Math.hypot(t.x + 0.5 - c.x, t.y + 0.5 - c.y) < 1.45) { c.path = []; if (!c.op) doAct(G, c, { k: 'chop', i }); } else if (sp) go(G, c, sp.x, sp.y); }

  // ======================= IL GIOCO NEL MOTORE =======================
  function setup(G) {
    G.tr = []; G.trN = 0; G.mmN = []; G.trD = new Map(); G.trC = null; G.sp = []; G.spN = 0; G.fly = []; G.shouts = []; G.digs = []; G.dgN = 0; G.traps = []; G.rab = []; G.rbN = 0; G.rabT = 2; G.jk = []; G.jkN = 0;
    G.meat = []; G.home = 0; G.butch = 0; G.cut = {}; G.fall = []; G.lg = []; G.lgN = 0; G.trump = null; G.kn = null; G.ph = 0;
    G.spy = 0; G.spyCd = 0; G.zcur = null; G.fav = 0;
    G.fuel = 45; G.food = 0; G.wind = Math.random() * Math.PI * 2; G.windT = 70; G.windTo = G.wind;
    cq.mapDirty = true;
  }
  function mmStart(G) {
    const C = MP().camp, all = placeList('eat').concat(placeList('drink')).sort((a, b) => Math.hypot(b.x - C.x, b.y - C.y) - Math.hypot(a.x - C.x, a.y - C.y)), L2 = all.filter(p => Math.hypot(p.x - C.x, p.y - C.y) > 55);
    const p = L2.length ? L2[Math.floor(Math.random() * L2.length)] : all[Math.floor(Math.random() * Math.min(3, all.length))];   // nasce lontano dal campo
    G.mm = { x: p.x, y: p.y, face: 1, walk: 0, path: [], st: 'walk', tgt: null, hp: 0, max: 0, need: { e: Math.random(), w: Math.random() }, aw: 0, wary: 0, fear: [], mudT: 0, dT: 20, gT: 1, trT: 30, meat: MEAT_N, side: 1 };
    G.mm.max = G.mm.hp = 6 + Math.floor(G.chars.length / 2);
    // un paio di minuti di vita prima della partita: cosi' ci sono gia' tracce da seguire
    for (let i = 0; i < 260; i++) { G.time = -130 + i * 0.5; mmTick(G, 0.5, true); }
    G.time = 0; G.trump = null; if (G.mm.st === 'sleep') { G.mm.st = 'walk'; G.mm.tgt = null; }
  }
  CQ_MODES.mammut = {
    n: 'Caccia al mammut',
    desc: '🦣 Una tribù, un mammut furbo nella foschia. Seguite le tracce per trovarlo; le lance lo feriscono, ma per abbatterlo serve la fossa o circondarlo. Le notti sono dure: legna, conigli e sciacalli. Poi la carne al campo, prima che migri.',
    maps: [['prateria', 'Prateria']],
    def: { nights: 2, map: 'prateria', n: 6, fill: true },
    ns: [[2, '2'], [4, '4'], [6, '6'], [8, '8']],
    opts: o => `<details class="row mmHow"><summary><b>📖 Come si gioca</b> (tocca per leggere)</summary>${helpHtml()}</details><div class="row"><div class="lbl">Notti prima che il mammut migri</div>${seg('nights', [[2, '2'], [3, '3'], [4, '4']], o.nights || 2)}</div>`,
    read: d => ({ nights: +d.get('nights') || 2 }),
    start(G) {
      setup(G);
      const bots = G.chars.filter(c => c.bot); bots.forEach((c, i) => { c.role = i % 3 === 2 || (bots.length <= 2 && i === 1) ? 'g' : 'h'; });
      for (const c of G.chars) Object.assign(c, { sp: SPEARS, logs: 0, rab: 0, mt: -1, tor: 0, dn: 0, rv: 0, hun: 0, op: null, hits: 0, rbK: 0, lgK: 0, rvK: 0, mtK: 0, jkK: 0 });
      mmStart(G);
    },
    gstart(G) { setup(G); for (const c of G.chars) Object.assign(c, { sp: SPEARS, logs: 0, rab: 0, mt: -1, tor: 0, dn: 0, rv: 0, hun: 0 }); G.mm = { x: 0, y: 0, face: 1, walk: 0, path: [], st: 'walk', hp: 1, max: 1, need: { e: 0, w: 0 }, fear: [], meat: MEAT_N }; },
    intro: () => '🦣 Nella foschia il mammut si vede solo da vicino: seguite le tracce. Le lance lo feriscono, ma per abbatterlo serve la FOSSA o CIRCONDARLO. Prima del buio: legna e un coniglio a testa!',
    speed(c) {
      const G = cq.g; if (!G || !G.tr) return 1; if (!c.alive) return 1.1; if (c.dn) return 0;
      if (c.op) { const q = P(c); if (Math.hypot(q.x - c.op.x, q.y - c.op.y) < 0.6 && G.time - c.op.t0 < 0.4) return 1; }
      return (c.mt >= 0 ? 0.72 : 1) * (1 - 0.07 * (c.logs || 0)) * (c.hun ? (c.hun > 1 ? 0.68 : 0.82) : 1);
    },
    big(G) {
      const me = G.me, q = { x: cq.x, y: cq.y }, t = cyc(G), m = G.mm; if (!G.tr) return '';
      if (G.won) return '🍖 La tribù ha la sua carne! Festa al fuoco!';
      if (!me.alive) return '👻 Sei un fantasma: guardi la caccia.';
      if (me.dn) return '🤕 A terra! Un compagno vicino ti rialza… (' + Math.ceil(DOWN_T - (G.time - me.dn)) + ' s)';
      if (me.op) return { chop: '🪓 Taglio la legna… resta fermo', dig: G.chars.filter(o => o.op && o.op.k === 'dig' && o.op.i === me.op.i && o.alive && !o.dn).length >= 2 ? '⛏️ Scavate insieme… restate fermi' : '⛏️ Da solo non si scava: serve un compagno vicino a te!', butch: '🔪 Macello il mammut… resta fermo', look: '👁️ Guardi lontano dall\'alto delle pietre… resta fermo' }[me.op.k] || '';
      if (me.mt >= 0) return '🍖 Porta la carne al fuoco del campo! (pesante)';
      if (m && m.st === 'wind' && Math.hypot(m.x - q.x, m.y - q.y) < 6) return '⚠️ IL MAMMUT STA PER CARICARE! Spostati di lato!';
      if (m && m.sn && m.sn.id === me.id && G.time - m.sn.t < 3) return '👃 Il mammut ti ha fiutato: hai il vento alle spalle!';
      if (t > DUSK - 25 && t < NIGHT && !atCamp(q.x, q.y, 8)) return G.fuel < 30 ? '🌇 Sta per fare buio e il fuoco è quasi spento: portate legna al campo!' : '🌇 Sta per fare buio: torna al fuoco del campo!';
      const rf = isNight(G) && !inFire(G, q.x, q.y) ? refuge(q.x, q.y) : null;
      if (rf) return { glade: '✨ Tra le lucciole sei al sicuro: gli sciacalli non entrano nella radura.', spring: '♨️ Il calore della sorgente tiene lontani gli sciacalli.', dolmen: '🪨 Sotto il dolmen gli sciacalli non ti prendono.' }[rf];
      if (isNight(G) && !inFire(G, q.x, q.y) && !torchOn(G, me)) return '🌑 Sei fuori dalla luce del fuoco: gli sciacalli cacciano al buio…';
      if (isNight(G) && !inCore(G, q.x, q.y)) return '🔥 Sei al bordo della luce: gli sciacalli osano fin qui. Vicino alle fiamme sei al sicuro.';
      if (m && (m.st === 'stuck' || m.st === 'trap') && Math.hypot(m.x - q.x, m.y - q.y) < 9) return m.st === 'trap' ? '🕳️ È nella fossa: tirate le lance, ora fanno male davvero!' : '🦣 È circondato: tirate le lance, ora fanno male davvero!';
      if (isNight(G) && G.fuel < 20 && (me.logs || 0) === 0) return '🪵 Il fuoco sta morendo: serve qualcuno che vada a fare legna al buio!';
      // la traccia piu' vicina sotto i piedi: cosa racconta
      let tb = null, td = 1.15; for (const tr of G.tr) { const d = Math.hypot(tr.x - q.x, tr.y - q.y); if (d < td) { td = d; tb = tr; } }
      if (tb) return trackTxt(G, tb);
      if ((me.logs || 0) || (me.rab || 0)) return atCamp(q.x, q.y, 3.2) && me.logs ? '🪵 Il fuoco è pieno: tieni la legna per la notte (la metti quando cala).' : '🔥 Porta al fuoco del campo: ' + (me.logs ? '🪵×' + me.logs + ' ' : '') + (me.rab ? '🐇×' + me.rab : '');
      if (me.hun) return me.hun > 1 ? '😵 Sfinito dalla fame: stasera devi mangiare un coniglio!' : '😣 Affamato: sei più lento. Stasera serve un coniglio a testa.';
      return '';
    },
    hud(G) {
      if (!G.tr) return '🦣 Caccia al mammut';
      const t = cyc(G), d = dayN(G), nightNow = t >= NIGHT && t < DAWN, left = nightNow ? DAWN - t : t < DUSK ? DUSK - t : t < NIGHT ? NIGHT - t : DAY - t + DUSK, last = d >= NN(G);
      const m = G.mm, hp = m && m.st === 'dead' ? '🦴' : m ? '❤️' + m.hp + (m.max && m.hp <= mmFloor(m) ? '🛡️' : '') : '';
      return `🦣 ${hp} · ${nightNow ? '🌙 Notte' : t >= DUSK ? '🌇 Tramonto' : '☀️ Giorno'} ${d}/${NN(G)}${last && !nightNow ? ' ⚠️' : ''} · ⏳ ${mmss(left)} · 🔥 ${Math.round(G.fuel)} · 🐇 ${G.food} · 🍖 ${G.home}/${MEAT_NEED} · 💨 ${windArrow(G)}`;
    },
    nameCol: c => c.dn ? '#ff8a6a' : c.hun ? '#e0c060' : null,
    draw: c => { const f = (g, X, Y, TW, L2, w, fc) => tribal(g, X, Y, TW, L2, w, fc, c); return f; },
    extras: G => extras(G),
    btn(G) { const a = action(G, G.me); return a ? { t: a.t, on: a.on } : null; },
    act(G) { const me = G.me, a = action(G, me); if (!a || !a.on) return; if (a.k === 'paint') { paintUI(G); return; } if (G.guest) { cqNetSend({ k: 'a', a: a.k, i: a.i }); if (a.k === 'chop' || a.k === 'dig' || a.k === 'butch' || a.k === 'look') me.op = { k: a.k, i: a.i, t0: G.time, x: cq.x, y: cq.y, local: 1 }; } else doAct(G, me, a); },
    ev(G, c, o) { if (!o) return; if (o.k === 'a') doAct(G, c, { k: o.a, i: o.i }); else if (o.k === 'th') doThrow(G, c, 'any'); else if (o.k === 'sh') doShout(G, c); },
    // su ogni telefono: alberi tagliati, pulsanti, colpi d'ascia, battito quando uno sciacallo e' vicino al buio
    local(G, dt) {
      if (!G.tr) return;
      syncTrees(G); sideHud(G); if ((G.tcT = (G.tcT || 0) - dt) <= 0) { G.tcT = 0.25; trackCells(G); }
      for (const c of G.chars) if (c.op && c.op.k === 'chop' && Math.hypot(c.x - cq.x, c.y - cq.y) < 12 && (c.axT = (c.axT || 0) - dt) <= 0) { c.axT = 0.45; thud(0.9, 480 + Math.random() * 120); }
      for (const c of G.chars) if (c.op && c.op.k === 'dig' && Math.hypot(c.x - cq.x, c.y - cq.y) < 10 && (c.axT = (c.axT || 0) - dt) <= 0) { c.axT = 0.6; thud(0.7, 260); }
      const me = G.me;
      const zk = lmAt(cq.x, cq.y); if (zk !== G.zcur) { G.zcur = zk; if (zk && G.time > 0.5) { const d = LMS[zk]; G.zn = { n: d[0] + ' ' + d[1], d: d[2], t: performance.now() / 1000 }; } }
      if (inMarsh(cq.x, cq.y) && me.alive) { if (Math.hypot(cq.x - (G.mrx == null ? cq.x : G.mrx), cq.y - (G.mry == null ? cq.y : G.mry)) > 0.5) { G.mrx = cq.x; G.mry = cq.y; beep(1700 + Math.random() * 900, 0.04, 0.008); beep(2500 + Math.random() * 600, 0.03, 0.006, 0.03); } } else { G.mrx = cq.x; G.mry = cq.y; }
      if (me.op && me.op.local && Math.hypot(cq.x - me.op.x, cq.y - me.op.y) > 0.6) me.op = null;
      // passi pesanti del mammut, sciacalli vicini nel buio (battito)
      const now = performance.now();
      if (me.alive && isNight(G) && G.phase === 'play') { let d = 99; for (const j of G.jk) d = Math.min(d, Math.hypot(j.x - cq.x, j.y - cq.y)); if (d < 7 && now > (G.hb || 0)) { const v = 0.02 + 0.05 * (1 - d / 7); beep(55, 0.09, v); beep(50, 0.11, v * 0.8, 0.16); G.hb = now + 360 + d * 110; } }
      if (G.trump && G.trump.t !== G.trHeard && G.time - G.trump.t < 1.5) { G.trHeard = G.trump.t; const d = Math.hypot(G.trump.x - cq.x, G.trump.y - cq.y); if (d < HEAR_T || !me.alive) trumpetSnd(G, G.trump.l); if (d > 10 && d < HEAR_T && me.alive) cqToast('🦣 Un barrito ' + (d > 30 ? 'lontano' : 'non lontano') + ', ' + IZ.dir(G.trump.x - cq.x, G.trump.y - cq.y) + '.'); }
      if (isNight(G) && (G.howlT = (G.howlT || 8) - dt) <= 0 && G.jk.length && me.alive) { G.howlT = 14 + Math.random() * 14; const j = G.jk[Math.floor(Math.random() * G.jk.length)]; G.howl = { x: j.x, y: j.y, t: performance.now() }; [520, 580, 640, 600, 520].forEach((f, i) => beep(f, 0.22, 0.018, i * 0.16)); }
      G.fly = G.fly.filter(f => G.time - f[4] < 0.6); G.shouts = G.shouts.filter(s => G.time - s[2] < 1.2);
    },
    tick(G, dt) {
      const t = cyc(G), F = fireC();
      // vento che gira piano
      if ((G.windT -= dt) <= 0) { G.windT = 70 + Math.random() * 40; G.windTo = G.wind + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.9); }
      G.wind += Math.max(-dt * 0.15, Math.min(dt * 0.15, G.windTo - G.wind));
      // fuoco: si consuma (di piu' di notte)
      const was = G.fuel > 0; G.fuel = Math.max(0, G.fuel - dt * (isNight(G) ? BURN_N : BURN_D)); if (was && G.fuel <= 0) say(G, 'fire', {});
      // fasi del giorno: notte (cena, sciacalli), alba
      const ph = t >= NIGHT && t < DAWN ? 1 : 0;
      if (ph !== G.ph) {
        G.ph = ph;
        if (ph) {
          let h = 0; for (const c of G.chars) if (c.alive) { if (G.food > 0) { G.food--; c.hun = 0; } else { c.hun = (c.hun || 0) + 1; h++; } }
          say(G, 'meal', { h }); jkSpawn(G);
        } else if (G.time > 10) say(G, 'dawn', { d: dayN(G), last: dayN(G) >= NN(G) });
      }
      mmTick(G, dt);
      const m = G.mm;
      // chi vede il mammut lo dice agli altri (per il computer)
      if (m.st !== 'dead') for (const c of active(G)) if (canSee(G, c, m.x, m.y) && dxy(c, m.x, m.y) < 10) { G.kn = { x: m.x, y: m.y, t: G.time }; break; }
      if (m.st !== 'dead' && (G.spy || 0) > G.time) G.kn = { x: m.x, y: m.y, t: G.time };   // dalla vedetta tutti sanno dov'e'
      for (const c of active(G)) { const q = P(c); if (!inMarsh(q.x, q.y)) { c.mrX = null; continue; } if (c.mrX == null) { c.mrX = q.x; c.mrY = q.y; } if (Math.hypot(q.x - c.mrX, q.y - c.mrY) > 1.4) { c.mrX = q.x; c.mrY = q.y; mmNoise(G, q.x, q.y, 'reed'); } }   // le canne frusciano
      rabTick(G, dt); jkTick(G, dt);
      // azioni in corso (tagliare, scavare, macellare): ci si deve stare fermi
      for (const c of active(G)) {
        if (!c.op) continue; const q = P(c);
        if (Math.hypot(q.x - c.op.x, q.y - c.op.y) > 0.6) { c.op = null; continue; }
        if (c.op.k === 'chop' && G.time - c.op.t0 >= CHOP_T) { const i = c.op.i; c.op = null; if (!G.cut[i] && (c.logs || 0) < LOGS_MAX) { G.cut[i] = G.time + REGROW; c.logs = (c.logs || 0) + 1; c.lgK = (c.lgK || 0) + 1;  mmNoise(G, c.op && c.op.x || P(c).x, P(c).y, 'ax'); } }
        else if (c.op.k === 'look' && G.time - c.op.t0 >= LOOK_T) { c.op = null; if ((G.spyCd || 0) <= G.time) { G.spy = G.time + SPY_T; G.spyCd = G.time + SPY_CD; say(G, 'spy', { a: c.id }); for (const o of G.chars) o.goM = 0; } }
        else if (c.op.k === 'butch' && G.time - c.op.t0 >= BUTCH_T) {
          c.op = null; if (!G.butch && m.st === 'dead') { G.butch = 1; const n = Math.max(0, m.meat); for (let i = 0; i < n; i++) { const a = i / Math.max(1, n) * Math.PI * 2, x = Math.floor(m.x + Math.cos(a) * 1.2), y = Math.floor(m.y + Math.sin(a) * 1.2), s = cqCellFree(x, y) ? { x: x + 0.5, y: y + 0.5 } : cqSpot(Math.floor(m.x), Math.floor(m.y)); G.meat.push({ id: i, st: 0, c: -1, x: s.x, y: s.y }); } say(G, 'butch', { v: n }); }
        }
      }
      for (const d of G.digs.slice()) {
        const n = active(G).filter(c => c.op && c.op.k === 'dig' && c.op.i === d.id).length;
        if (n >= 2) d.p += dt / DIG_T * (n >= 3 ? 1.3 : 1);
        if (d.p >= 1) { G.digs = G.digs.filter(o => o !== d); G.traps.push({ id: d.id, x: d.x, y: d.y, used: 0 }); for (const c of G.chars) if (c.op && c.op.k === 'dig' && c.op.i === d.id) c.op = null; say(G, 'dig', {}); }
      }
      // raccogliere (lance, carne), consegnare al campo (legna, conigli, carne), rialzare i compagni
      for (const c of active(G)) {
        const q = P(c);
        if ((c.sp || 0) < SPEAR_MAX) { const s = G.sp.find(o => Math.hypot(o.x - q.x, o.y - q.y) < 0.75); if (s) { G.sp = G.sp.filter(o => o !== s); c.sp = (c.sp || 0) + 1; } }
        if (c.mt < 0 && !(c.logs || 0)) { const it = G.meat.find(i => i.st === 0 && Math.hypot(i.x - q.x, i.y - q.y) < 0.8); if (it) { it.st = 1; it.c = c.id; c.mt = it.id; } }
        if (atCamp(q.x, q.y, 3.2)) {
          while (c.logs && G.fuel < FUEL_MAX - LOG_FUEL * 0.5) { G.fuel = Math.min(FUEL_MAX, G.fuel + LOG_FUEL); c.logs--; }
          if (c.rab) { G.food += c.rab; c.rab = 0; }
          if (c.mt >= 0) { const it = G.meat[c.mt]; if (it) { it.st = 2; it.c = -1; } c.mt = -1; c.mtK = (c.mtK || 0) + 1; G.home++; say(G, 'home', { a: c.id, v: G.home }); }
          if (atCamp(q.x, q.y, 2.6) && (c.sp || 0) < SPEARS) c.sp = SPEARS;   // rastrelliera del campo
        }
      }
      for (const c of G.chars) {
        if (!c.alive || !c.dn) continue;
        const h = active(G).find(o => dist2(o, c) < 1.4);
        if (h) { c.rv += dt / REV_T; if (c.rv >= 1) { c.dn = 0; c.rv = 0; h.rvK = (h.rvK || 0) + 1; say(G, 'up', { a: c.id, b: h.id }); } } else c.rv = Math.max(0, c.rv - dt / 6);
        if (c.dn && G.time - c.dn > DOWN_T) { c.alive = false; c.dn = 0; say(G, 'ghost', { a: c.id }); }
      }
      for (const i in G.cut) if (G.cut[i] <= G.time) delete G.cut[i];
      // computer
      for (const c of G.chars) {
        if (!c.bot || !c.alive) continue;
        if (c.dn || c.op) { c.path = []; c.walk = 0; continue; }
        if ((c.think -= dt) <= 0) { c.think = 0.35 + Math.random() * 0.25; bot(G, c); }
        cqModeStep(c, dt, 0.92 * this.speed(c));
      }
      // fine
      if (G.home >= MEAT_NEED) { G.won = 1; this.finish(G, 1); return; }
      const avail = G.home + G.meat.filter(i => i.st === 0 || i.st === 1).length + (m.st === 'dead' && !G.butch ? Math.max(0, m.meat) : 0) + (m.st !== 'dead' ? MEAT_N : 0);
      if (avail < MEAT_NEED) { this.finish(G, 0, '🐺 Gli sciacalli si sono presi troppa carne: non ne resta abbastanza.'); return; }
      if (!G.chars.some(c => c.alive)) { this.finish(G, 0, '👻 Nessuno della tribù è sopravvissuto.'); return; }
      if (G.time >= endT(G) && m.st !== 'dead') { this.finish(G, 0, '🦣 Il mammut è migrato lontano: la caccia è fallita.'); return; }
      if (G.time >= endT(G) + DAY && G.home < MEAT_NEED) this.finish(G, 0, '🌅 Troppo tardi: la carne non è arrivata al campo.');
    },
    finish(G, win, why) {
      const name = c => c.name + (c === G.me ? ' (tu)' : '');
      const line = c => [name(c), '— 🎯 ' + (c.hits || 0) + ' · 🪵 ' + (c.lgK || 0) + ' · 🐇 ' + (c.rbK || 0) + ' · 🍖 ' + (c.mtK || 0) + ' · 🤝 ' + (c.rvK || 0) + (c.alive ? '' : ' · 👻')];
      const score = c => (c.hits || 0) * 5 + (c.mtK || 0) * 6 + (c.lgK || 0) + (c.rbK || 0) * 2 + (c.rvK || 0) * 4 + (c.jkK || 0) * 2;
      const rank = G.chars.slice().sort((a, b) => score(b) - score(a)).map(line);
      if (win) cqModeEnd({ t: '🍖 La tribù ce l\'ha fatta!', why: 'Il mammut è stato abbattuto e la carne è al sicuro nel campo (' + G.home + ' pezzi) dopo ' + mmss(G.time) + '.', win: G.chars.map(c => c.id), rank });
      else cqModeEnd({ t: '🦣 Caccia fallita', why: why || 'Il mammut è sfuggito.', win: [], rank });
    },
    // online: lance, legna, conigli, carne in mano, torcia, a terra, rialzo, fame, azione in corso, statistiche
    csnap: c => { const G = cq.g, r = v => Math.max(0, Math.round((v - G.time) * 10) / 10); return [c.sp || 0, c.logs || 0, c.rab || 0, c.mt, r(c.tor || 0), c.dn ? Math.round((G.time - c.dn) * 10) / 10 : 0, Math.round((c.rv || 0) * 100), c.hun || 0, c.op ? ({ chop: 1, dig: 2, butch: 3, look: 4 })[c.op.k] || 0 : 0, c.op ? (c.op.k === 'chop' ? c.op.i : c.op.k === 'dig' ? c.op.i : 0) : 0, c.op ? Math.round((G.time - c.op.t0) * 10) / 10 : 0, c.hits || 0, c.lgK || 0, c.rbK || 0, c.mtK || 0, c.rvK || 0, c.jkK || 0]; },
    capply(G, c, a) {
      [c.sp, c.logs, c.rab, c.mt] = a; c.tor = a[4] > 0 ? G.time + a[4] : 0; c.dn = a[5] > 0 ? G.time - a[5] || 0.01 : 0; c.rv = a[6] / 100; c.hun = a[7];
      const k = ['', 'chop', 'dig', 'butch', 'look'][a[8]];
      if (k) { if (!(c === G.me && c.op && c.op.local && c.op.k === k)) c.op = { k, i: a[9], t0: G.time - a[10], x: c === G.me ? cq.x : c.x, y: c === G.me ? cq.y : c.y }; else c.op.local = 0; } else if (!(c === G.me && c.op && c.op.local && G.time - c.op.t0 < 0.8)) c.op = null;
      [c.hits, c.lgK, c.rbK, c.mtK, c.rvK, c.jkK] = a.slice(11);
    },
    snap(G) {
      const r = v => Math.round(v * 10) / 10, m = G.mm;
      return { m: [r(m.x), r(m.y), m.face, m.walk ? 1 : 0, m.st, m.hp, m.max, r(m.aw || 0), m.sn ? [m.sn.id, r(m.sn.t)] : 0, m.meat],
        tr: G.tr.filter(t => t.ct > G.time - 6 || G.time < 6).map(t => [t.id, t.k, t.x, t.y, r(t.t), t.dx, t.dy]),
        sp: G.sp.map(s => [s.id, r(s.x), r(s.y)]), fl: G.fly.map(f => f.slice()), sh: G.shouts.map(s => s.slice()),
        dg: G.digs.map(d => [d.id, d.x, d.y, Math.round(d.p * 100)]), tp: G.traps.map(p => [p.id, p.x, p.y, p.used]),
        rb: G.rab.map(o => [o.id, r(o.x), r(o.y), o.face]), jk: G.jk.map(j => [j.id, r(j.x), r(j.y), j.face]),
        me: G.meat.map(i => [i.st, i.c, r(i.x), r(i.y)]), cut: Object.keys(G.cut).map(i => [+i, Math.round(G.cut[i] - G.time)]),
        f: r(G.fuel), fo: G.food, ho: G.home, bu: G.butch, w: Math.round(G.wind * 100) / 100, tu: G.trump ? [G.trump.x, G.trump.y, r(G.trump.t), G.trump.l] : 0, lg: G.lg, sy: [r((G.spy || 0) - G.time), r((G.spyCd || 0) - G.time)] };
    },
    apply(G, x) {
      if (!G.tr) return;
      const m = G.mm, a = x.m;
      if (!m.seen) { m.x = a[0]; m.y = a[1]; m.seen = 1; } cqNetGot(m, a[0], a[1], G.time, a[3]); m.face = a[2];   // G.time = ora dell'host appena arrivata m.mv = a[3]; m.st = a[4]; m.hp = a[5]; m.max = a[6]; m.aw = a[7]; m.sn = a[8] ? { id: a[8][0], t: a[8][1] } : null; m.meat = a[9];
      const have = new Set(G.tr.map(t => t.id)); for (const t of x.tr) if (!have.has(t[0])) G.tr.push({ id: t[0], k: t[1], x: t[2], y: t[3], t: t[4], dx: t[5], dy: t[6] });
      if (G.tr.length > 420) G.tr.splice(0, G.tr.length - 420);
      G.sp = x.sp.map(s => ({ id: s[0], x: s[1], y: s[2] }));
      for (const f of x.fl) if (!G.fly.some(o => o[4] === f[4] && o[0] === f[0])) G.fly.push(f);
      for (const s of x.sh) if (!G.shouts.some(o => o[2] === s[2] && o[3] === s[3])) G.shouts.push(s);
      G.digs = x.dg.map(d => ({ id: d[0], x: d[1], y: d[2], p: d[3] / 100 })); G.traps = x.tp.map(p => ({ id: p[0], x: p[1], y: p[2], used: p[3] }));
      const mv = (L2, arr) => arr.map(v => { const o = L2.find(q => q.id === v[0]) || { id: v[0], x: v[1], y: v[2], walk: 0 }; cqNetGot(o, v[1], v[2], G.time); o.face = v[3]; return o; });
      G.rab = mv(G.rab, x.rb); G.jk = mv(G.jk, x.jk);
      G.meat = x.me.map((v, i) => ({ id: i, st: v[0], c: v[1], x: v[2], y: v[3] }));
      G.cut = {}; for (const [i, s] of x.cut || []) G.cut[i] = G.time + s;
      G.fuel = x.f; G.food = x.fo; G.home = x.ho; G.butch = x.bu; G.wind = x.w; G.trump = x.tu ? { x: x.tu[0], y: x.tu[1], t: x.tu[2], l: x.tu[3] } : null;
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
      if (x.sy) { G.spy = G.time + x.sy[0]; G.spyCd = G.time + x.sy[1]; }
      if (G.home >= MEAT_NEED) G.won = 1;
    },
    // notte: buio pesto tranne il fuoco, la mia torcia e quelle dei compagni
    night(G) {
      if (!G.tr) return null;
      const dk = dark(G), me = G.me; if (dk <= 0) return null;
      if (!me.alive) return { a: 0.45 * dk, r: 6, lights: [], see: () => true };
      const lights = [], src = [], F = fireC(), fr = fireR(G);
      const mine = torchOn(G, me) ? TORCH_L : SEE_N;
      lights.push([cq.x, cq.y, mine + 0.6, 0.95]); src.push([cq.x, cq.y, mine]);
      if (fr) { const fl = fr + 0.6 + Math.sin(performance.now() / 160) * 0.15; lights.push([F.x, F.y, fl, 1]); src.push([F.x, F.y, fr]); }
      const L = LM();   // lucciole della radura e sorgente calda: luce (e rifugio)
      if (L.glade && Math.hypot(L.glade.x - cq.x, L.glade.y - cq.y) < 30) { lights.push([L.glade.x, L.glade.y, 5.9 + Math.sin(performance.now() / 700) * 0.25, 0.6]); src.push([L.glade.x, L.glade.y, 5.4]); }
      if (L.spring && Math.hypot(L.spring.x - cq.x, L.spring.y - cq.y) < 30) { lights.push([L.spring.x, L.spring.y, 3.7, 0.5]); src.push([L.spring.x, L.spring.y, 3.2]); }
      for (const c of G.chars) { if (c === me || !c.alive) continue; if (Math.hypot(c.x - cq.x, c.y - cq.y) > 24) continue; const r = torchOn(G, c) ? TORCH_L : 2.2; lights.push([c.x, c.y, r + 0.4, torchOn(G, c) ? 0.9 : 0.6]); src.push([c.x, c.y, r * 0.9]); }
      // lit: quanta luce c'e' in un punto (0 buio, 1 pieno), sfumata sul bordo: serve agli occhi degli sciacalli che svaniscono entrando nella luce
      const lit = (x, y) => { let v = 0; for (const [sx, sy, r] of src) v = Math.max(v, Math.min(1, Math.max(0, (r + 0.6 - Math.hypot(x - sx, y - sy)) / 1.8))); return v; };
      return { a: 0.96 * dk, r: mine, lights, lit, see: (x, y) => dk < 0.5 || src.some(([sx, sy, r]) => Math.hypot(x - sx, y - sy) < r) };
    },
    deco(g, c, X, Y, TW, G) {
      if (c.op) { const T2 = { chop: CHOP_T, dig: DIG_T, butch: BUTCH_T, look: LOOK_T }[c.op.k] || 3, k = c.op.k === 'dig' ? ((G.digs.find(d => d.id === c.op.i) || {}).p || 0) : Math.min(1, (G.time - c.op.t0) / T2); g.strokeStyle = { chop: '#c8a070', dig: '#a88a5a', butch: '#e05050', look: '#a8d0ff' }[c.op.k]; g.lineWidth = 4; g.beginPath(); g.arc(X, Y - TW * 2.05, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); }
      if (c.dn) { const k = c.rv || 0; g.fillStyle = 'rgba(0,0,0,.6)'; cqRR(g, X - 22, Y - TW * 1.45, 44, 8, 4); g.fill(); g.fillStyle = '#7be0a0'; cqRR(g, X - 21, Y - TW * 1.45 + 1, Math.max(3, 42 * k), 6, 3); g.fill(); g.font = '14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🤕', X, Y - TW * 1.85); }
      // cosa porta: sopra la testa
      const L2 = []; if (c.mt >= 0) L2.push('🍖'); if (c.logs) L2.push('🪵' + (c.logs > 1 ? c.logs : '')); if (c.rab) L2.push('🐇' + (c.rab > 1 ? c.rab : ''));
      if (L2.length && !c.dn) { g.font = Math.round(TW * 0.36) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L2.join(' '), X + TW * 0.55, Y - TW * 1.6); }
      if (torchOn(G, c) && !c.dn) { const f = c === G.me ? cq.face : c.face, x0 = X + f * TW * 0.42, y0 = Y - TW * 1.25, t = performance.now() / 90; g.strokeStyle = '#6b4a2e'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0 + TW * 0.5); g.lineTo(x0, y0); g.stroke(); g.fillStyle = '#ffb030'; g.beginPath(); g.ellipse(x0, y0 - 4 - Math.sin(t) * 1.5, 5, 8 + Math.sin(t * 1.3) * 2, 0, 0, 7); g.fill(); g.fillStyle = '#ffe680'; g.beginPath(); g.ellipse(x0, y0 - 2, 2.6, 4.5, 0, 0, 7); g.fill(); }
    },
    over(g, G, sx, sy, TW) {
      if (!G.tr) return;
      const W = cq.w, H = cq.h, now = performance.now() / 1000, MN = this.night(G), see = (x, y) => !MN || MN.see(x, y), on = (X, Y, m = 40) => X > -m && X < W + m && Y > -m && Y < H + m;
      const font = (s) => { g.font = s + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; };
      haze(g, G, sx, sy, TW);   // foschia sopra la prateria e i personaggi, sotto i segni del gioco
      // fiamme del fuoco del campo
      { const F = fireC(), X = sx(F.x, F.y), Y = sy(F.x, F.y); if (on(X, Y) && G.fuel > 0) { const k = Math.min(1, 0.4 + G.fuel / 70); for (let i = 0; i < 3; i++) { const t = now * 6 + i * 2.1, dx = (i - 1) * 6, h = (18 + Math.sin(t) * 5) * k; g.fillStyle = i === 1 ? '#ffd040' : '#ff7a1a'; g.beginPath(); g.moveTo(X + dx - 7 * k, Y - 4); g.quadraticCurveTo(X + dx - 4, Y - h * 0.6, X + dx + Math.sin(t * 1.7) * 2, Y - 4 - h); g.quadraticCurveTo(X + dx + 4, Y - h * 0.6, X + dx + 7 * k, Y - 4); g.fill(); } } if (on(X, Y) && G.fuel <= 0) { g.strokeStyle = 'rgba(200,200,200,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X, Y - 6); g.quadraticCurveTo(X + 6 * Math.sin(now * 2), Y - 18, X, Y - 30); g.stroke(); }
        // scorte: conigli sulla cesta
        const sx2 = sx(F.x + 3, F.y - 1), sy2 = sy(F.x + 3, F.y - 1); if (on(sx2, sy2) && G.food > 0) { font(13); g.fillText('🐇' + (G.food > 1 ? '×' + G.food : ''), sx2, sy2 - TW * 0.75); } }
      // luoghi speciali: lucciole (o farfalle di giorno) nella radura, spruzzi della cascata, vapore della sorgente, corvi sul cimitero
      { const L = LM(), dk = dark(G), Zp = TW * 0.575, near = (o, r = 24) => o && Math.abs(o.x - cq.x) < r && Math.abs(o.y - cq.y) < r;
        if (near(L.glade)) { const gl = L.glade;
          if (dk > 0.12) for (let i = 0; i < 32; i++) { const a = i * 2.39 + now * (0.12 + (i % 5) * 0.025), r = 1 + ((i * 37) % 55) / 10, x = gl.x + Math.cos(a) * r + Math.sin(now * 0.7 + i) * 0.35, y = gl.y + Math.sin(a) * r + Math.cos(now * 0.6 + i * 1.3) * 0.35, X = sx(x, y), Y = sy(x, y) - (0.6 + 0.45 * Math.sin(now * 1.1 + i)) * Zp; if (!on(X, Y)) continue; const b = (0.5 + 0.5 * Math.sin(now * 2.6 + i * 1.9)) * Math.min(1, dk * 1.5); g.fillStyle = 'rgba(210,255,110,' + (0.3 * b) + ')'; g.beginPath(); g.arc(X, Y, 6.5, 0, 7); g.fill(); g.fillStyle = 'rgba(245,255,190,' + b + ')'; g.beginPath(); g.arc(X, Y, 1.9, 0, 7); g.fill(); }
          else for (let i = 0; i < 6; i++) { const a = now * 0.4 + i * 1.05, x = gl.x + Math.cos(a * (1 + i * 0.1)) * (2.6 + i * 0.5), y = gl.y + Math.sin(a * 0.8) * (2.6 + (i % 3)), X = sx(x, y), Y = sy(x, y) - (0.8 + 0.3 * Math.sin(now * 2 + i)) * Zp, fl = Math.abs(Math.sin(now * 14 + i)); if (!on(X, Y)) continue; g.fillStyle = ['#ffd84a', '#ffffff', '#9fd0ff', '#ffa0d0'][i % 4]; g.beginPath(); g.ellipse(X - 3, Y, 3.2, 2.4 * fl + 0.4, 0.4, 0, 7); g.ellipse(X + 3, Y, 3.2, 2.4 * fl + 0.4, -0.4, 0, 7); g.fill(); } }
        if (near(L.fall, 20)) { const f = L.fall, vt = MP().vert; for (let i = 0; i < 18; i++) { const k = (now * 0.9 + i / 18) % 1, o2 = ((i * 7) % 9) / 8 - 0.5, x = vt ? f.x + o2 * 1.8 : f.x + 0.5 + k * 0.7, y = vt ? f.y + 0.5 + k * 0.7 : f.y + o2 * 1.8, X = sx(x, y), Y = sy(x, y) - (0.3 * (1 - k) + 0.35 * Math.sin(k * Math.PI)) * Zp; if (!on(X, Y)) continue; g.fillStyle = 'rgba(255,255,255,' + (0.85 * (1 - k)) + ')'; g.beginPath(); g.arc(X, Y, 1.8, 0, 7); g.fill(); }
          for (let i = 0; i < 3; i++) { const x = vt ? f.x + (i - 1) * 0.7 : f.x + 0.9, y = vt ? f.y + 0.9 : f.y + (i - 1) * 0.7, X = sx(x, y), Y = sy(x, y) - 4; if (!on(X, Y)) continue; g.fillStyle = 'rgba(255,255,255,' + (0.16 + 0.06 * Math.sin(now * 2 + i)) + ')'; g.beginPath(); g.ellipse(X, Y, TW * 0.45, TW * 0.2, 0, 0, 7); g.fill(); } }
        if (near(L.spring, 20)) { const q = L.spring; for (let i = 0; i < 7; i++) { const p = (now * 0.32 + i / 7) % 1, x = q.x + Math.sin(i * 2.1) * 0.5, y = q.y + Math.cos(i * 1.7) * 0.5, X = sx(x, y) + Math.sin(now * 1.5 + i) * 6 * p, Y = sy(x, y) - p * 2.8 * Zp; if (!on(X, Y)) continue; g.fillStyle = 'rgba(240,246,246,' + (0.34 * (1 - p)) + ')'; g.beginPath(); g.ellipse(X, Y, 8 + p * 15, 5 + p * 8, 0, 0, 7); g.fill(); } }
        if (near(L.cem, 26) && dk < 0.6) for (let i = 0; i < 3; i++) { const a = now * 0.5 + i * 2.1, x = L.cem.x + Math.cos(a) * 3, y = L.cem.y + Math.sin(a) * 3, X = sx(x, y), Y = sy(x, y) - (4 + i * 0.4) * Zp, fl = Math.sin(now * 9 + i) * 4; if (!on(X, Y)) continue; g.strokeStyle = '#1a1a1e'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(X - 8, Y - fl); g.quadraticCurveTo(X - 3, Y - 3, X, Y); g.quadraticCurveTo(X + 3, Y - 3, X + 8, Y - fl); g.stroke(); }
      }
      // tracce del mammut (solo dove si vede)
      for (const t of G.tr) {   // il vapore dello sterco fresco e delle buche calde (le tracce sono nel terreno)
        if ((t.k !== 'dung' && t.k !== 'bed') || Math.abs(t.x - cq.x) > 14 || Math.abs(t.y - cq.y) > 14 || !see(t.x, t.y)) continue;
        const a = G.time - t.t, warm = t.k === 'dung' ? a < 60 : a < 90 || (G.mm.st === 'sleep' && Math.hypot(G.mm.x - t.x, G.mm.y - t.y) < 1.5); if (!warm) continue;
        const X = sx(t.x, t.y), Y = sy(t.x, t.y), u = TW / 34; if (!on(X, Y)) continue;
        g.strokeStyle = 'rgba(240,240,240,.45)'; g.lineWidth = 1.6; for (let i = 0; i < (t.k === 'bed' ? 3 : 2); i++) { const p = ((now * 0.55 + i * 0.4) % 1), x0 = X + (i - 0.5) * (t.k === 'bed' ? 10 : 6) * u, y0 = Y - 4 * u - p * 18 * u; g.globalAlpha = 1 - p; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 3 * u * Math.sin(now * 3 + i), y0 - 4 * u, x0, y0 - 8 * u); g.stroke(); } g.globalAlpha = 1;
      }
      // fosse in corso e pronte (coperte di rami: le vedono solo i cacciatori)
      for (const d of G.digs) { const X = sx(d.x, d.y), Y = sy(d.x, d.y); if (!on(X, Y) || !see(d.x, d.y)) continue; g.fillStyle = '#4a3420'; g.beginPath(); g.ellipse(X, Y, TW * 0.45 * (0.4 + 0.6 * d.p), TW * 0.22 * (0.4 + 0.6 * d.p), 0, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.6)'; cqRR(g, X - 20, Y - TW * 0.9, 40, 7, 3.5); g.fill(); g.fillStyle = '#e0c060'; cqRR(g, X - 19, Y - TW * 0.9 + 1, Math.max(3, 38 * d.p), 5, 2.5); g.fill(); }
      for (const p of G.traps) { const X = sx(p.x, p.y), Y = sy(p.x, p.y); if (!on(X, Y) || !see(p.x, p.y)) continue; const used = p.used && !(G.mm.st === 'trap' && Math.hypot(G.mm.x - p.x, G.mm.y - p.y) < 0.5); g.fillStyle = used ? '#3a2818' : '#2a1e14'; g.beginPath(); g.ellipse(X, Y, TW * 0.55, TW * 0.27, 0, 0, 7); g.fill(); if (!p.used) { g.strokeStyle = '#8a6a3a'; g.lineWidth = 2.5; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(X - TW * 0.45, Y + i * 3); g.lineTo(X + TW * 0.45, Y - i * 2); g.stroke(); } g.fillStyle = 'rgba(120,150,60,.75)'; g.beginPath(); g.ellipse(X, Y, TW * 0.3, TW * 0.12, 0, 0, 7); g.fill(); font(11); g.fillText('🕳️', X, Y - TW * 0.55); } }
      // lance a terra, carne a terra
      for (const s of G.sp) { const X = sx(s.x, s.y), Y = sy(s.x, s.y); if (!on(X, Y) || !see(s.x, s.y)) continue; g.strokeStyle = '#8a6a42'; g.lineWidth = 3; g.beginPath(); g.moveTo(X - 13, Y + 3); g.lineTo(X + 13, Y - 5); g.stroke(); g.fillStyle = '#d8d0c0'; g.beginPath(); g.moveTo(X + 13, Y - 5); g.lineTo(X + 19, Y - 8); g.lineTo(X + 12, Y - 9); g.fill(); g.fillStyle = 'rgba(255,240,160,.25)'; g.beginPath(); g.ellipse(X, Y, 16, 7, 0, 0, 7); g.fill(); }
      for (const it of G.meat) { if (it.st !== 0) continue; const X = sx(it.x, it.y), Y = sy(it.x, it.y); if (!on(X, Y) || !see(it.x, it.y)) continue; g.fillStyle = 'rgba(255,200,160,' + (0.25 + Math.sin(now * 3 + it.id) * 0.08) + ')'; g.beginPath(); g.ellipse(X, Y, 15, 7, 0, 0, 7); g.fill(); font(20); g.fillText('🍖', X, Y - 8); }
      // lance in volo
      for (const f of G.fly) { const k = Math.min(1, (G.time - f[4]) / 0.35); if (k >= 1) continue; const x = f[0] + (f[2] - f[0]) * k, y = f[1] + (f[3] - f[1]) * k, X = sx(x, y), Y = sy(x, y) - TW * (0.9 + Math.sin(k * Math.PI) * 0.6), a = Math.atan2(sy(f[2], f[3]) - sy(f[0], f[1]), sx(f[2], f[3]) - sx(f[0], f[1])); g.save(); g.translate(X, Y); g.rotate(a); g.strokeStyle = '#8a6a42'; g.lineWidth = 3; g.beginPath(); g.moveTo(-16, 0); g.lineTo(12, 0); g.stroke(); g.fillStyle = '#d8d0c0'; g.beginPath(); g.moveTo(12, -3); g.lineTo(19, 0); g.lineTo(12, 3); g.fill(); g.restore(); }
      // urla: onde
      for (const s of G.shouts) { const k = (G.time - s[2]) / 1.2; if (k < 0 || k >= 1) continue; const X = sx(s[0], s[1]), Y = sy(s[0], s[1]) - TW; g.strokeStyle = 'rgba(255,230,160,' + (0.7 * (1 - k)) + ')'; g.lineWidth = 3; for (const o of [0, 0.3]) { const r = (0.5 + Math.max(0, k - o) * 5) * TW; if (k > o) { g.beginPath(); g.ellipse(X, Y + TW, r, r * 0.5, 0, 0, 7); g.stroke(); } } }
      const m = G.mm;
      // il mammut: punto interrogativo che si riempie se si sta accorgendo di qualcuno, naso se ha fiutato, "!" rosso prima della carica, zzz se dorme
      if (m && m.st !== 'dead' && see(m.x, m.y) && (!G.me.alive || mmShown(G, cq.x, cq.y))) {
        const X = sx(m.x, m.y), Y = sy(m.x, m.y) - TW * 2.35;
        if (on(X, Y)) {
          if (m.st === 'wind' || m.st === 'charge') { font(26); g.fillStyle = '#ff3a2a'; g.fillText('❗', X, Y - 6 + Math.sin(now * 20) * 2); }
          else if (m.st === 'sleep') { font(14); g.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const p = (now * 0.5 + i / 3) % 1; g.globalAlpha = 1 - p; g.fillText('z', X + 10 + p * 14, Y - p * 22); } g.globalAlpha = 1; }
          else if (m.sn && G.time - m.sn.t < 2.5) { font(20); g.fillText('👃', X, Y); }
          else if ((m.aw || 0) > 0.25 && m.st !== 'flee' && m.st !== 'trap') { const k = Math.min(1, m.aw); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(X, Y, 11, 0, 7); g.fill(); g.strokeStyle = k > 0.75 ? '#ff6a4a' : '#ffd060'; g.lineWidth = 3; g.beginPath(); g.arc(X, Y, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); font(13); g.fillStyle = '#fff'; g.fillText('?', X, Y + 1); }
        }
      }
      // occhi rossi degli sciacalli nel buio: fissi (niente lampeggi), svaniscono piano entrando nella luce (li' si vede il corpo),
      // e da lontano compaiono sfumando (13-17 caselle) invece di accendersi di colpo
      if (MN && MN.lit && dark(G) > 0.3) for (const j of G.jk) {
        const d = Math.hypot(j.x - cq.x, j.y - cq.y); if (d > 17) continue;
        const al = 0.9 * Math.min(1, (dark(G) - 0.3) / 0.4) * (1 - MN.lit(j.x, j.y)) * (d < 13 ? 1 : (17 - d) / 4); if (al < 0.03) continue;
        const X = sx(j.x, j.y), Y = sy(j.x, j.y) - TW * 0.55; if (!on(X, Y)) continue;
        g.fillStyle = 'rgba(255,40,30,' + al.toFixed(3) + ')';
        for (const dx of [-3.5, 3.5]) { g.beginPath(); g.ellipse(X + dx * (j.face || 1), Y, 2.6, 1.8, 0, 0, 7); g.fill(); }
      }
      // ululato: freccia sul bordo verso lo sciacallo che ulula
      if (G.howl && performance.now() - G.howl.t < 2200) edge(g, sx(G.howl.x, G.howl.y), sy(G.howl.x, G.howl.y), W, H, '🐺', 'rgba(255,90,70,.9)');
      // barrito: freccia sul bordo per qualche secondo
      if (G.trump && G.time - G.trump.t < 4 && Math.hypot(G.trump.x - cq.x, G.trump.y - cq.y) < HEAR_T) { const X = sx(G.trump.x, G.trump.y), Y = sy(G.trump.x, G.trump.y); edge(g, X, Y, W, H, '🦣', '#e0b84a'); }
      // freccia verso il fuoco: quando porto qualcosa, al tramonto e di notte se sono lontano
      { const F = fireC(), me = G.me, t = cyc(G); if (me.alive && !me.dn && (me.mt >= 0 || me.logs || me.rab || (t > DUSK - 25 && t < DAWN)) && !atCamp(cq.x, cq.y, 6)) edge(g, sx(F.x, F.y), sy(F.x, F.y), W, H, '🔥', '#ff9a40'); }
      // nome del luogo quando ci entri
      if (G.zn && now - G.zn.t < 3.6 && !G.big) { const k = now - G.zn.t, al = k < 0.4 ? k / 0.4 : k > 2.8 ? Math.max(0, (3.6 - k) / 0.8) : 1, Yz = Math.min(H * 0.36, 300); g.globalAlpha = al; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '800 21px system-ui,sans-serif'; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(G.zn.n, W / 2 + 1.5, Yz + 1.5); g.fillStyle = '#ffe9a8'; g.fillText(G.zn.n, W / 2, Yz);
        if (G.zn.d) { g.font = '600 13px system-ui,sans-serif'; const ws = G.zn.d.split(' '), Ls = []; let l = ''; for (const w of ws) { if (g.measureText(l + ' ' + w).width > W - 60 && l) { Ls.push(l); l = w; } else l = l ? l + ' ' + w : w; } Ls.push(l); Ls.forEach((t, i) => { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(t, W / 2 + 1, Yz + 25 + i * 17 + 1); g.fillStyle = '#f4ead2'; g.fillText(t, W / 2, Yz + 25 + i * 17); }); }
        g.globalAlpha = 1; }
      // rosa del vento in alto a destra
      if (G.me.alive || true) minimap(g, G);
      if (!G.big) { const X = W - RADAR - 8 - RADAR + 22, Y = 122 + RADAR * 2 + 44, a = G.wind, sxv = Math.cos(a) - Math.sin(a), syv = (Math.cos(a) + Math.sin(a)) / 2, an = Math.atan2(syv, sxv);
        g.fillStyle = 'rgba(20,22,28,.6)'; g.beginPath(); g.arc(X, Y, 22, 0, 7); g.fill(); g.save(); g.translate(X, Y); g.rotate(an); g.strokeStyle = '#e8f4ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, 0); g.lineTo(11, 0); g.stroke(); g.fillStyle = '#e8f4ff'; g.beginPath(); g.moveTo(14, 0); g.lineTo(5, -6); g.lineTo(5, 6); g.fill(); g.restore(); font(11); g.fillStyle = '#fff'; g.fillText('💨', X, Y + 32); }
    }
  };
  function windArrow(G) { const a = G.wind; return arrowOf(Math.cos(a), Math.sin(a)); }
  // FOSCHIA del giorno: limpido fino a HAZE0 caselle da me, poi velo chiaro (oltre VIEW_D il mammut non si vede).
  // Immagine pronta a un terzo della risoluzione, rifatta solo se cambiano misura dello schermo o posizione del centro; poi solo incollata
  function haze(g, G, sx, sy, TW) {
    const day = 1 - Math.min(1, dark(G) * 2); if (day <= 0.02 || !G.me.alive) return;
    const W = cq.w, H = cq.h, k = 3, X = sx(cq.x, cq.y), Y = sy(cq.x, cq.y) - TW * 0.3;
    // una casella sullo schermo: in larghezza TW x 0,707, in altezza la meta' (misure fisse: le colline non devono cambiare la forma della foschia)
    const ux = TW * 0.7071, uy = TW * 0.3536;
    const key = [W, H, Math.round(X / k), Math.round(Y / k), Math.round(ux), Math.round(uy)].join(',');
    let c = haze.c; if (!c) c = haze.c = document.createElement('canvas');
    if (haze.k !== key) {
      haze.k = key; c.width = Math.ceil(W / k); c.height = Math.ceil(H / k); const h = c.getContext('2d');
      h.clearRect(0, 0, c.width, c.height); h.save(); h.translate(X / k, Y / k); h.scale(1, uy / ux);
      const r0 = HAZE0 * ux / k, r1 = VIEW_D * 1.08 * ux / k, gr = h.createRadialGradient(0, 0, r0, 0, 0, r1);
      gr.addColorStop(0, 'rgba(222,228,212,0)'); gr.addColorStop(0.55, 'rgba(222,228,212,.38)'); gr.addColorStop(1, 'rgba(222,228,212,.72)');
      h.fillStyle = gr; const R = Math.hypot(c.width, c.height) * Math.max(1, ux / uy) * 2; h.fillRect(-R, -R, 2 * R, 2 * R); h.restore();
    }
    g.globalAlpha = day; g.drawImage(c, 0, 0, c.width, c.height, 0, 0, c.width * k, c.height * k); g.globalAlpha = 1;
  }
  function edge(g, X, Y, W, H, icon, col) {
    const m = 34, top = 120, bot = H - 140; if (X > m && X < W - m && Y > top && Y < bot) return;
    const cx = W / 2, cy = (top + bot) / 2, dx = X - cx, dy = Y - cy, k = Math.min(Math.abs((W / 2 - m) / (dx || 1e-6)), Math.abs(((bot - top) / 2) / (dy || 1e-6)));
    const ex = cx + dx * k, ey = cy + dy * k, a = Math.atan2(dy, dx);
    g.fillStyle = col; g.beginPath(); g.moveTo(ex + Math.cos(a) * 20, ey + Math.sin(a) * 20); g.lineTo(ex + Math.cos(a + 2.4) * 12, ey + Math.sin(a + 2.4) * 12); g.lineTo(ex + Math.cos(a - 2.4) * 12, ey + Math.sin(a - 2.4) * 12); g.fill();
    g.fillStyle = 'rgba(20,22,28,.85)'; g.beginPath(); g.arc(ex, ey, 13, 0, 7); g.fill();
    g.font = '14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(icon, ex, ey + 1);
  }
  // ======================= MAPPA (radar in alto a destra, grande toccandola): il terreno, il campo, i compagni; il mammut no =======================
  const MCOL = { 1: [130, 160, 78], 2: [104, 150, 62], 3: [70, 104, 50], 4: [130, 110, 80], 5: [120, 200, 225], 6: [60, 140, 210], 7: [176, 150, 106], 8: [126, 184, 80], 9: [84, 112, 66], 10: [186, 172, 112], 11: [156, 152, 142], 12: [186, 144, 92], 13: [130, 222, 210], 14: [210, 238, 248] };
  const RADAR = 62;
  function mapImg() {
    const M = MP(); if (M.mimg) return M.mimg;
    const W = CQ_W, H = CQ_H, c = document.createElement('canvas'); c.width = W; c.height = H; const sg = c.getContext('2d', CQ_CPU), im = sg.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, o = cqSolid[y] && cqSolid[y][x], t = M.ter[y][x]; let col = MCOL[t] || [90, 120, 60];
      const pr = o && o.prop; if (pr === 'tree' || pr === 'stump' || pr === 'willow' || pr === 'gtree') col = [40, 78, 38]; else if (pr === 'boulder' || pr === 'menhir' || pr === 'pwall' || pr === 'dolm' || pr === 'srock' || pr === 'wrock') col = [150, 146, 136]; else if (pr === 'tusks' || pr === 'mskull' || pr === 'ribs') col = [228, 216, 186]; else if (pr === 'fall') col = [230, 246, 252]; else if (o && o.prop === 'thick') col = [34, 56, 30];
      const z = M.hz[y][x]; if (z && t <= 3) col = col.map(v => Math.min(255, v + z * 16));
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    sg.putImageData(im, 0, 0); return (M.mimg = c);
  }
  function mapDraw(g, G, X, Y, R, s, cx, cy, big) {
    const me = G.me, M = MP(), img = mapImg(), now = performance.now();
    const P2 = (x, y) => [X + (x - cx - (y - cy)) * s * 0.7071, Y + (x - cx + (y - cy)) * s * 0.7071];
    g.save();
    g.fillStyle = 'rgba(14,18,12,.9)'; g.strokeStyle = '#c8a060'; g.lineWidth = 2.5; g.beginPath(); if (big) cqRR(g, X - R, Y - R, R * 2, R * 2, 16); else g.arc(X, Y, R, 0, 7); g.fill(); g.stroke();
    g.beginPath(); if (big) cqRR(g, X - R + 3, Y - R + 3, R * 2 - 6, R * 2 - 6, 14); else g.arc(X, Y, R - 2, 0, 7); g.clip();
    g.translate(X, Y); g.rotate(Math.PI / 4); g.scale(s, s); g.translate(-cx, -cy); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0); g.setTransform(cq.dpr || 1, 0, 0, cq.dpr || 1, 0, 0);
    const ico = (x, y, t, sz) => { const [a, b] = P2(x, y); g.font = sz + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, a, b); };
    const sz = big ? 16 : 12, F = fireC();
    if (big) { for (const p of placeList('eat')) ico(p.x, p.y, '🌾', 11); for (const p of G.traps) ico(p.x, p.y, '🕳️', 11); }
    { const [a, b] = P2(F.x, F.y); g.fillStyle = 'rgba(255,150,60,' + (0.3 + 0.15 * Math.sin(now / 250)) + ')'; g.beginPath(); g.arc(a, b, sz * 0.9, 0, 7); g.fill(); ico(F.x, F.y, '🔥', sz); }
    for (const c of G.chars) if (c !== me && c.alive) { const [a, b] = P2(c.x, c.y); g.fillStyle = c.dn ? '#ff6a4a' : '#ffe9a0'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.arc(a, b, c.dn ? 4.5 : 3.5, 0, 7); g.fill(); g.stroke(); }
    { const L = LM(); for (const k in LMS) { const o = L[k]; if (!o) continue; ico(o.x, o.y, LMS[k][0], big ? 15 : 11); if (big) { const [a, b] = P2(o.x, o.y); g.font = '700 9.5px system-ui,sans-serif'; g.fillStyle = 'rgba(0,0,0,.65)'; g.fillText(LMS[k][1], a + 1, b + 14); g.fillStyle = '#fff3d6'; g.fillText(LMS[k][1], a, b + 13); } } }
    if (big && G.fav) { const M = MP(), fv = M.fav, L = LM(), pts = []; const e = M.places.eat[fv.eat]; if (e) pts.push([e[0] + 0.5, e[1] + 0.5]); if (fv.drink === -1 && L.glade) pts.push([L.glade.x, L.glade.y]); else { const d = M.places.drink[fv.drink]; if (d) pts.push([d[0] + 0.5, d[1] + 0.5]); } if (fv.sleep === -1 && L.gtree) pts.push([L.gtree.x, L.gtree.y]); else { const q = M.places.sleep[fv.sleep]; if (q) pts.push([q[0] + 0.5, q[1] + 0.5]); }
      for (const [x, y] of pts) { const [a, b] = P2(x, y); g.font = '14px system-ui,sans-serif'; g.fillText('⭐', a + 11, b - 9); } }
    if ((G.spy || 0) > G.time && G.mm && G.mm.st !== 'dead') { const [a, b] = P2(G.mm.x, G.mm.y); g.fillStyle = 'rgba(255,110,50,' + (0.35 + 0.25 * Math.sin(now / 140)) + ')'; g.beginPath(); g.arc(a, b, sz + 2, 0, 7); g.fill(); ico(G.mm.x, G.mm.y, '🦣', sz + 3); }   // dalla vedetta
    if (G.mm && G.mm.st === 'dead') ico(G.mm.x, G.mm.y, '🍖', sz);   // abbattuto: si sa dove sta la carcassa
    const [mx, my] = P2(cq.x, cq.y), wx = cq.wdx || 1, wy = cq.wdy || 0, ang = Math.atan2((wx + wy) * 0.7071, (wx - wy) * 0.7071);
    g.translate(mx, my); g.rotate(ang); g.fillStyle = '#ffffff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(8, 0); g.lineTo(-5, -5.5); g.lineTo(-2.5, 0); g.lineTo(-5, 5.5); g.closePath(); g.fill(); g.stroke();
    g.restore();
    if (big) { g.font = '600 12px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(240,230,200,.9)'; g.fillText('🔥 campo · 🌾 pascoli · ✨🗿🎨 luoghi speciali' + (G.fav ? ' · ⭐ abitudini del mammut' : ''), X, Y + R + 16); g.fillText('tocca per chiudere', X, Y + R + 32); }
  }
  function minimap(g, G) {
    const W2 = cq.w, H2 = cq.h;
    if (G.big) { const R = Math.min(W2 - 24, H2 - 300, 460) / 2, cy = Math.max(130 + R, H2 / 2 - 40); mapDraw(g, G, W2 / 2, cy, R, (R * 2 - 10) / (CQ_W * 1.4142), CQ_W / 2, CQ_H / 2, true); return; }
    mapDraw(g, G, W2 - RADAR - 8, 122 + RADAR, RADAR, 1.6, cq.x, cq.y, false);
    g.font = '600 10px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(240,236,220,.85)'; g.fillText('🗺️ tocca', W2 - RADAR - 8, 122 + RADAR * 2 + 12);
  }
  function syncTrees(G) {
    MP().trees.forEach((t, i) => {
      const want = G.cut[i] ? 1 : 0; if ((t.cut ? 1 : 0) === want) return;
      t.cut = want; cqSolid[t.y][t.x] = want ? { prop: 'stump', o: {} } : { prop: 'tree', o: t };
      cqBgCell(t.x, t.y);
      if (want && G.time > 0.5 && Math.hypot(t.x - cq.x, t.y - cq.y) < 14) thud(1.2, 120);
    });
  }

  // ======================= PERSONAGGI DISEGNATI =======================
  // la tribu': una grande MASCHERA TRIBALE decorata sul viso, sugli occhi del personaggio (6 modelli, uno per personaggio). A terra: sdraiato
  function tribal(g, X, Y, TW, L2, w, f, c) {
    const u = TW / 34;
    if (c.dn) { g.save(); g.translate(X, Y - 4 * u); g.rotate(f > 0 ? -1.35 : 1.35); g.translate(0, 6 * u); cqPlayer(g, 0, 0, TW, L2, 0, f); g.restore(); return; }
    if (!c.alive) g.globalAlpha = 0.45;
    cqPlayer(g, X, Y, TW, L2, w, f);
    // la maschera va dove il personaggio ha gli occhi (CQ_EYES del motore), grande: copre tutta la faccia
    const E = (typeof CQ_EYES !== 'undefined' && (CQ_EYES[L2.skin] || CQ_EYES.omino)) || [[[0.8, -28.3], [7.2, -28.3]]];
    const ex = E[0].reduce((a, e) => a + e[0], 0) / E[0].length, eyy = E[0].reduce((a, e) => a + e[1], 0) / E[0].length, bob = Math.abs(Math.sin(w)) * 4 * u, k = 1.45;
    mask(g, X + f * ex * u, Y - bob + eyy * u + 2.2 * k * u, u * k, c.mk != null ? c.mk : (c.id * 5 + 3) % 6);
    g.globalAlpha = 1;
  }
  // maschere (coordinate della maschera: alta da -12 a +12, larga +-8)
  function mask(g, cx, cy, s, v) {
    g.save(); g.translate(cx, cy); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
    const P = (pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
    const E = (x, y, rx, ry, col, r = 0) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, r, 0, 7); g.fill(); };
    const Lw = (col, w) => { g.strokeStyle = col; g.lineWidth = w; };
    const oval = (col, w = 7.5, h = 11.5) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, -h); g.bezierCurveTo(w, -h, w + 0.6, -2, w * 0.8, 4); g.bezierCurveTo(w * 0.6, 9, 3, h, 0, h); g.bezierCurveTo(-3, h, -w * 0.6, 9, -w * 0.8, 4); g.bezierCurveTo(-w - 0.6, -2, -w, -h, 0, -h); g.fill(); };
    const eyes = (y, col, slit) => { for (const sx of [-1, 1]) { E(sx * 3.4, y, 2.5, 1.3, col, sx * 0.25); E(sx * 3.4, y + 0.1, 1.5, 0.45, slit || '#111'); } };
    const out = col => { Lw(col, 0.8); g.beginPath(); g.moveTo(0, -11.5); g.bezierCurveTo(7.5, -11.5, 8.1, -2, 6, 4); g.bezierCurveTo(4.5, 9, 3, 11.5, 0, 11.5); g.bezierCurveTo(-3, 11.5, -4.5, 9, -6, 4); g.bezierCurveTo(-8.1, -2, -7.5, -11.5, 0, -11.5); g.stroke(); };
    if (v === 0) {   // nera con le ossa in testa e i denti a griglia
      for (const [x, y] of [[-6.5, -10], [-3.2, -13.5], [3.2, -13.5], [6.5, -10], [0, -15]]) { Lw('#555', 1.6); g.beginPath(); g.moveTo(x * 0.6, y * 0.75); g.lineTo(x, y); g.stroke(); E(x - 0.9, y, 1.2, 1.2, '#6a6a6a'); E(x + 0.9, y, 1.2, 1.2, '#6a6a6a'); }
      oval('#2e2e30'); E(0, -1, 5.5, 8, '#454548');
      Lw('#f2efe6', 0.6); g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * 1.4, -9.5); g.lineTo(i * 1.9, -6.8); } g.stroke();
      eyes(-2.5, '#f2efe6', '#111'); P([0, -6, 1.4, 1.5, -1.4, 1.5], '#f2efe6');
      E(0, 6.2, 4.6, 2.6, '#f2efe6'); Lw('#111', 0.45); g.beginPath(); for (let i = -3; i <= 3; i++) { g.moveTo(i * 1.2, 4); g.lineTo(i * 1.2, 8.4); } g.moveTo(-4.4, 6.2); g.lineTo(4.4, 6.2); g.stroke();
      out('#111');
    } else if (v === 1) {   // terracotta allungata con la corona nera e la punta
      oval('#b0522e', 7, 12.5);
      P([0, -17, 1.4, -11, -1.4, -11], '#1e1a18'); for (let i = 0; i < 3; i++) E(0, -15 + i * 1.6, 0.45, 0.45, '#f2efe6');
      P([-7.4, -7.5, 7.4, -7.5, 7.4, -4.6, -7.4, -4.6], '#1e1a18'); for (let i = -3; i <= 3; i++) P([i * 2 - 0.6, -7.5, i * 2 + 0.6, -7.5, i * 2, -9.2], '#1e1a18');
      Lw('#f2efe6', 0.55); g.beginPath(); for (let i = 0; i < 3; i++) { g.moveTo(-5, -10.5 + i * 0.9); g.lineTo(5, -10.5 + i * 0.9); } g.stroke();
      eyes(-2, '#f2efe6', '#1e1a18'); P([0, -4.5, 1.3, 2.5, -1.3, 2.5], '#8a3a1e');
      for (const sx of [-1, 1]) { Lw('#f2efe6', 0.6); g.beginPath(); for (let i = 0; i < 3; i++) { g.moveTo(sx * 4, 0.5 + i * 1.3); g.lineTo(sx * 6.4, 0.2 + i * 1.3); } g.stroke(); }
      E(0, 7, 2.8, 2.4, '#f2efe6'); E(0, 7.2, 2, 1.7, '#1e1a18'); out('#5a2412');
    } else if (v === 2) {   // oro con la corona ricamata e i tappi alle orecchie
      for (const sx of [-1, 1]) { P([sx * 7, -2.5, sx * 10.5, -3.5, sx * 10.5, -0.5, sx * 7, 0.5], '#1e1a18'); E(sx * 10.6, -2, 0.7, 1.6, '#c89a3a'); }
      oval('#c89a3a');
      P([-8.5, -9, -7, -15, -3.5, -12.5, 0, -16.5, 3.5, -12.5, 7, -15, 8.5, -9], '#1e1a18');
      Lw('#d8b050', 0.5); g.beginPath(); for (const x of [-5, 0, 5]) { g.moveTo(x - 1.5, -10); g.quadraticCurveTo(x, -14, x + 1.5, -10); } g.stroke(); for (let i = -3; i <= 3; i++) E(i * 2.2, -8.6, 0.5, 0.5, '#d8b050');
      eyes(-3, '#f8f2e2', '#1e1a18'); Lw('#7a5a1a', 0.6); g.beginPath(); g.moveTo(0, -5); g.lineTo(0, 1.5); g.stroke();
      E(0, 6, 5.2, 2.7, '#1e1a18'); g.fillStyle = '#f8f2e2'; for (let i = -3; i <= 3; i++) g.fillRect(i * 1.3 - 0.5, 4.4, 1, 3); out('#5a4010');
    } else if (v === 3) {   // rossa con le corna nere e il disco in fronte
      for (const sx of [-1, 1]) { g.fillStyle = '#1e1a18'; g.beginPath(); g.moveTo(sx * 4, -10); g.quadraticCurveTo(sx * 13, -12, sx * 14, -18); g.quadraticCurveTo(sx * 11, -12, sx * 3, -7.5); g.fill(); }
      oval('#b8322a'); E(0, -7, 2.4, 2.4, '#1e1a18');
      Lw('#f2efe6', 0.6); g.beginPath(); g.moveTo(-6.4, -3.6); g.lineTo(6.4, -3.6); g.moveTo(-6, 2.6); g.lineTo(6, 2.6); g.moveTo(-4.5, 9); g.lineTo(4.5, 9); for (let i = -2; i <= 2; i++) { if (i) { g.moveTo(i * 1.2, -11); g.lineTo(i * 1.4, -9.6); } } g.stroke();
      eyes(-0.8, '#f2efe6', '#1e1a18'); E(0, 6, 3.2, 1.9, '#1e1a18'); g.fillStyle = '#f2efe6'; g.fillRect(-2, 5.2, 4, 0.7); out('#5a1410');
    } else if (v === 4) {   // bruna con le corna ricce e i puntini bianchi
      for (const sx of [-1, 1]) { Lw('#3a2414', 2.4); g.beginPath(); g.moveTo(sx * 5, -9); g.bezierCurveTo(sx * 14, -15, sx * 14, -2, sx * 9.5, -4); g.stroke(); Lw('#8a5a32', 1.2); g.beginPath(); g.moveTo(sx * 5, -9); g.bezierCurveTo(sx * 14, -15, sx * 14, -2, sx * 9.5, -4); g.stroke(); }
      oval('#7a4a2a'); P([-6.5, -3.5, 6.5, -3.5, 5.5, -0.8, -5.5, -0.8], '#1e1a18');
      eyes(-2.1, '#f2efe6', '#1e1a18'); Lw('#f2efe6', 0.55); g.beginPath(); g.moveTo(0, -10.5); g.quadraticCurveTo(1.6, -7, 0, -4); g.moveTo(0, -1); g.lineTo(0, 3); g.stroke();
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) E(sx * (3.2 + i * 0.85), 1.5 + i * 0.9, 0.42, 0.42, '#f2efe6');
      P([-2.8, 8, 2.8, 8, 1.6, 6.3, -1.6, 6.3], '#f2efe6'); out('#2a1608');
    } else {   // blu con la cresta bianca, le lacrime e gli orecchini
      for (const a of [-1.1, -0.55, 0, 0.55, 1.1]) { const r = a === 0 ? 17 : 14.5; P([Math.sin(a) * 6, -Math.cos(a) * 8 - 2, Math.sin(a) * r, -Math.cos(a) * r, Math.sin(a + 0.18) * 7, -Math.cos(a + 0.18) * 8 - 2], '#f2efe6'); }
      for (const sx of [-1, 1]) { Lw('#e8e2d0', 0.9); g.beginPath(); g.ellipse(sx * 8.6, 4, 1.6, 2.6, 0, 0, 7); g.stroke(); }
      oval('#4a5a78'); E(0, -1, 5, 7.5, '#5a6c8c');
      for (let i = -3; i <= 3; i++) E(i * 1.7, -8.2, 0.45, 0.45, '#f2efe6');
      eyes(-2.6, '#f2efe6', '#1e2230'); Lw('#f2efe6', 0.55); g.beginPath(); for (const sx of [-1, 1]) { g.moveTo(sx * 3.4, -1); g.quadraticCurveTo(sx * 4, 2.5, sx * 3, 5); } g.moveTo(0, -5); g.lineTo(0, 1.5); g.stroke();
      E(0, 7.2, 2.8, 1.6, '#f2efe6'); E(0, 7.4, 2, 0.8, '#1e2230'); out('#1a2030');
    }
    g.restore();
  }
  // il mammut, disegnato di profilo: cupola della testa alta, dorso che scende, pelo lungo che pende, zanne ricurve e proboscide.
  // Dorme sdraiato, prima della carica alza la proboscide e trema, abbattuto giace su un fianco; nella fossa se ne vede solo la parte alta
  function drawMammoth(g, X, Y, TW, mm) {
    const u = TW / 34 * 0.86, f = mm.face || 1, st = mm.st, t = performance.now() / 1000, w = mm.walkA || 0;
    const sleep = st === 'sleep' || st === 'rest', dead = st === 'dead', trap = st === 'trap', wind = st === 'wind', cur = st === 'cur';
    g.save();
    if (trap) { g.fillStyle = '#2a1e14'; g.beginPath(); g.ellipse(X, Y, 50 * u, 22 * u, 0, 0, 7); g.fill(); g.fillStyle = '#4a3622'; g.beginPath(); g.ellipse(X, Y - 3 * u, 50 * u, 10 * u, 0, Math.PI, 0); g.fill(); g.beginPath(); g.rect(X - 90 * u, Y - 120 * u, 180 * u, 118 * u); g.clip(); }
    g.translate(X + (wind ? Math.sin(t * 40) * 1.4 * u : 0), Y + (trap ? 24 * u : 0) + (sleep ? 12 * u : 0) + (dead ? 16 * u : 0)); g.scale(f * u, u);
    if (!trap) { g.fillStyle = 'rgba(0,0,0,.26)'; g.beginPath(); g.ellipse(0, -(sleep ? 12 : dead ? 16 : 0), 48, 13, 0, 0, 7); g.fill(); }
    if (dead) g.rotate(-0.12);
    const furD = '#4a2e18', fur = '#6e4526', furL = '#93643a', ivory = '#f6eedb';
    // zampe: dietro (piu' scure) e davanti; camminando si alternano
    const leg = (x, ph, col) => { const s = Math.sin(w + ph) * 3.5, lx = x + s; g.fillStyle = col; g.beginPath(); g.moveTo(lx - 6.5, -30); g.lineTo(lx + 6.5, -30); g.lineTo(lx + 6, -3); g.quadraticCurveTo(lx, 0, lx - 6, -3); g.closePath(); g.fill(); g.fillStyle = '#c9b89a'; g.beginPath(); g.ellipse(lx, -2, 6.4, 2.6, 0, 0, 7); g.fill(); g.fillStyle = '#e8dcc4'; for (const k of [-3.5, 0, 3.5]) { g.beginPath(); g.ellipse(lx + k, -1.6, 1.2, 0.9, 0, 0, 7); g.fill(); } g.fillStyle = col; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(lx - 7 + i * 3.5, -30); g.lineTo(lx - 5.5 + i * 3.5, -20 - (i % 2) * 3); g.lineTo(lx - 4 + i * 3.5, -30); g.fill(); } };
    if (!sleep && !dead) { leg(-24, 0, furD); leg(16, Math.PI, furD); }
    if (dead) for (const [x, a] of [[-22, 0.2], [-10, 0.35], [12, 0.25], [24, 0.4]]) { g.save(); g.translate(x, -20); g.rotate(a); g.fillStyle = furD; g.fillRect(-5, 0, 10, 26); g.fillStyle = '#c9b89a'; g.beginPath(); g.ellipse(0, 26, 5.5, 2.5, 0, 0, 7); g.fill(); g.restore(); }
    // zanna lontana (dietro la proboscide)
    const tusk = (dx, dy, k, col) => { g.save(); g.translate(dx, dy); g.scale(k, k); g.fillStyle = col; g.beginPath(); g.moveTo(34, -36); g.bezierCurveTo(52, -32, 70, -22, 66, -48); g.bezierCurveTo(64, -40, 60, -30, 52, -30); g.bezierCurveTo(44, -30, 38, -31, 34, -30); g.closePath(); g.fill(); g.strokeStyle = 'rgba(120,100,70,.55)'; g.lineWidth = 0.8; g.stroke(); g.restore(); };
    tusk(-3, -2, 0.92, '#d8cdb4');
    // corpo
    const grd = g.createLinearGradient(0, -78, 0, -14); grd.addColorStop(0, furL); grd.addColorStop(0.45, fur); grd.addColorStop(1, furD);
    g.fillStyle = grd; g.beginPath();
    g.moveTo(-34, -22); g.bezierCurveTo(-46, -30, -44, -52, -32, -58); g.bezierCurveTo(-18, -64, -2, -63, 8, -67);
    g.bezierCurveTo(16, -79, 34, -76, 39, -60); g.bezierCurveTo(42, -52, 43, -45, 40, -38); g.lineTo(34, -30);
    g.bezierCurveTo(30, -24, 24, -21, 18, -21); g.bezierCurveTo(8, -15, -20, -15, -34, -22); g.closePath(); g.fill();
    // pelo lungo che pende dal ventre e dai fianchi
    g.fillStyle = furD; g.beginPath(); g.moveTo(-38, -26); for (let i = 0; i <= 14; i++) { const x = -38 + i * 4.2; g.lineTo(x + 2.1, -10 - (i % 3) * 2.5 - (i > 9 ? 3 : 0)); g.lineTo(x + 4.2, -22 + (i > 11 ? -2 : 0)); } g.lineTo(22, -26); g.closePath(); g.fill();
    g.fillStyle = fur; g.beginPath(); g.moveTo(-36, -30); for (let i = 0; i <= 13; i++) { const x = -36 + i * 4.3; g.lineTo(x + 2.1, -17 - (i % 2) * 3); g.lineTo(x + 4.3, -28); } g.closePath(); g.fill();
    // pelo a ciocche sovrapposte (come tegole), piu' chiare in alto, e qualche ciocca lunga di luce sul dorso
    const rows = [[-58, -26, 12, 'rgba(150,104,62,.55)'], [-49, -36, 18, 'rgba(120,80,46,.5)'], [-40, -38, 26, 'rgba(96,62,34,.5)'], [-31, -36, 24, 'rgba(76,48,26,.55)']];
    g.lineWidth = 1.2;
    rows.forEach(([y, x0, x1, col], r) => { g.strokeStyle = col; g.beginPath(); for (let x = x0 + (r % 2) * 3; x < x1; x += 6) { const j = Math.sin(x * 1.7 + r * 3) * 1.3, yy = y + j + (x > 6 && r === 0 ? -4 - (x - 6) * 0.25 : 0); g.moveTo(x - 3.5, yy - 1); g.quadraticCurveTo(x, yy + 3.5, x + 3.5, yy - 1); } g.stroke(); });
    g.strokeStyle = 'rgba(196,150,100,.45)'; g.lineWidth = 1.1; g.beginPath();
    for (const [x, y, l] of [[-30, -57, 9], [-20, -60, 11], [-9, -61, 8], [2, -64, 10], [12, -70, 7], [-38, -44, 8]]) { g.moveTo(x, y); g.bezierCurveTo(x - 2, y + l * 0.4, x + 1, y + l * 0.7, x - 1, y + l); }
    g.stroke();
    // cupola e ciuffo in testa, orecchio piccolo e peloso
    g.fillStyle = 'rgba(170,122,74,.5)'; g.beginPath(); g.ellipse(22, -66, 11, 6, -0.3, 0, 7); g.fill();
    g.strokeStyle = furL; g.lineWidth = 1.5; g.beginPath(); for (const x of [18, 22, 26, 30]) { g.moveTo(x, -72); g.quadraticCurveTo(x - 3, -80, x - 1, -83); } g.stroke();
    g.fillStyle = furD; g.beginPath(); g.ellipse(22, -49, 5.5, 7.5, -0.2, 0, 7); g.fill(); g.fillStyle = '#5a3a20'; g.beginPath(); g.ellipse(22.5, -49, 3.2, 5, -0.2, 0, 7); g.fill();
    // zampe davanti a noi
    if (!sleep && !dead) { leg(-12, Math.PI, fur); leg(26, 0, fur); }
    // proboscide: un tubo che si assottiglia lungo una curva (pieghe ad anello, riflesso sopra, punta con il "dito" e la narice).
    // Ondeggia sempre un po' (di piu' camminando), si alza arricciata prima della carica, a terra arrotolata se dorme o e' morto
    const walking = !sleep && !dead && !wind && (mm.walk || 0) !== (mm.wPrev || 0); mm.wPrev = mm.walk || 0;
    const sw = Math.sin(t * 1.3) * 2.2 + (walking ? Math.sin(w * 0.9) * 2.4 : 0), tc = Math.sin(t * 2.1 + 1) * 0.5 + 0.5;
    const pts = wind ? [[37, -44], [54, -56], [56, -82], [44, -92]] : cur ? [[37, -44], [50, -48], [58, -62], [56 + Math.sin(t * 3) * 2, -72]] : sleep || dead ? [[37, -42], [50, -32], [54, -14], [44, -10]] : [[37, -44], [47 + sw * 0.3, -32], [43 + sw, -14], [47 + sw * 1.4 + tc * 2, -4 - tc * 2]];
    const bz = (k, i) => { const q = 1 - k; return q * q * q * pts[0][i] + 3 * q * q * k * pts[1][i] + 3 * q * k * k * pts[2][i] + k * k * k * pts[3][i]; };
    const N2 = 22, L = [], R = [], C2 = [];
    for (let i = 0; i <= N2; i++) {
      const k = i / N2, x = bz(k, 0), y = bz(k, 1), k2 = Math.min(1, k + 0.02), k1 = Math.max(0, k - 0.02), dx = bz(k2, 0) - bz(k1, 0), dy = bz(k2, 1) - bz(k1, 1), d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, r = 6.2 - 3.4 * k;
      L.push([x + nx * r, y + ny * r]); R.push([x - nx * r, y - ny * r]); C2.push([x, y, nx, ny, r]);
    }
    const tube = (A, B, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(...A[0]); A.forEach(p => g.lineTo(...p)); for (let i = B.length - 1; i >= 0; i--) g.lineTo(...B[i]); g.closePath(); g.fill(); };
    tube(L, R, fur);
    tube(L, C2.map(([x, y, nx, ny, r]) => [x + nx * r * 0.25, y + ny * r * 0.25]), 'rgba(160,112,66,.55)');   // lato in luce
    const e = C2[N2], tip = [e[0], e[1]];
    g.fillStyle = fur; g.beginPath(); g.arc(tip[0], tip[1], e[4] + 0.4, 0, 7); g.fill();
    g.fillStyle = '#8a6040'; g.beginPath(); g.ellipse(tip[0] + e[2] * 1.4, tip[1] + e[3] * 1.4, 2.2, 1.6, Math.atan2(e[3], e[2]), 0, 7); g.fill();   // il "dito" della punta
    g.fillStyle = '#2a170a'; g.beginPath(); g.ellipse(tip[0] - e[2] * 0.6, tip[1] - e[3] * 0.6 + 0.6, 1.3, 0.9, 0, 0, 7); g.fill();   // narice
    g.strokeStyle = 'rgba(40,22,10,.45)'; g.lineWidth = 0.75;
    for (let i = 3; i < N2 - 1; i += 2) { const [x, y, nx, ny, r] = C2[i]; g.beginPath(); g.moveTo(x + nx * r * 0.9, y + ny * r * 0.9); g.quadraticCurveTo(x + (ny) * 1.2, y - nx * 1.2, x - nx * r * 0.9, y - ny * r * 0.9); g.stroke(); }
    // zanna vicina
    tusk(0, 0, 1, ivory);
    // occhio con la palpebra pesante (chiuso se dorme, a X se e' morto, rosso prima della carica)
    if (dead) { g.strokeStyle = '#1a120a'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(29, -54); g.lineTo(33, -50); g.moveTo(33, -54); g.lineTo(29, -50); g.stroke(); }
    else if (sleep) { g.strokeStyle = '#1a120a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(28.5, -52); g.quadraticCurveTo(31, -50.5, 33.5, -52); g.stroke(); }
    else { g.fillStyle = '#1a120a'; g.beginPath(); g.ellipse(31, -52, 2, 1.7, 0, 0, 7); g.fill(); g.fillStyle = wind ? '#ff5030' : '#fff'; g.beginPath(); g.arc(31.6, -52.6, 0.6, 0, 7); g.fill(); g.strokeStyle = '#3a2412'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(28, -54.2); g.quadraticCurveTo(31, -56, 34, -54); g.stroke(); }
    // lance piantate nel fianco (una per ferita)
    const hurt = Math.max(0, (mm.max || 0) - (mm.hp || 0)); g.lineWidth = 1.8;
    for (let i = 0; i < Math.min(5, hurt); i++) { const x0 = -24 + i * 9, y0 = -50 + (i % 2) * 6; g.strokeStyle = '#8a6a42'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - 12, y0 - 18); g.stroke(); g.fillStyle = 'rgba(150,20,20,.8)'; g.beginPath(); g.ellipse(x0, y0 + 1.5, 2, 3, 0, 0, 7); g.fill(); }
    // macellato: ossa a vista
    if (dead && (mm.meat <= 0 || (cq.g && cq.g.butch))) { g.strokeStyle = '#ece4d0'; g.lineWidth = 2.5; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-26 + i * 9, -24); g.quadraticCurveTo(-24 + i * 9, -50, -18 + i * 9, -26); g.stroke(); } }
    g.restore();
  }
  function drawRabbit(g, X, Y, TW, r) {
    const u = TW / 34, f = r.face || 1, hop = Math.abs(Math.sin((r.walk || 0) * 1.2)) * 5 * u;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(X, Y, 8 * u, 3 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#9a8268'; g.beginPath(); g.ellipse(X, Y - 6 * u - hop, 8 * u, 5.5 * u, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(X + f * 6 * u, Y - 10 * u - hop, 4.5 * u, 4 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#8a7258'; g.beginPath(); g.ellipse(X + f * 5 * u, Y - 17 * u - hop, 1.6 * u, 5 * u, -0.2 * f, 0, 7); g.fill(); g.beginPath(); g.ellipse(X + f * 7.5 * u, Y - 17 * u - hop, 1.6 * u, 5 * u, 0.2 * f, 0, 7); g.fill();
    g.fillStyle = '#f4f0e8'; g.beginPath(); g.arc(X - f * 8 * u, Y - 7 * u - hop, 2.4 * u, 0, 7); g.fill();
    g.fillStyle = '#1a120a'; g.beginPath(); g.arc(X + f * 8 * u, Y - 11 * u - hop, 0.9 * u, 0, 7); g.fill();
  }
  function drawJackal(g, X, Y, TW, j) {
    const u = TW / 34, f = j.face || 1, w = j.walk || 0, nt = cq.g && dark(cq.g) > 0.5;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(X, Y, 14 * u, 4 * u, 0, 0, 7); g.fill();
    for (const [dx, ph] of [[-8, 0], [-4, Math.PI], [5, Math.PI], [9, 0]]) { const s = Math.sin(w * 1.3 + ph) * 2.5 * u; g.strokeStyle = '#8a7048'; g.lineWidth = 2.6 * u; g.beginPath(); g.moveTo(X + f * dx * u, Y - 10 * u); g.lineTo(X + f * dx * u + s * f, Y); g.stroke(); }
    g.fillStyle = '#a88a58'; g.beginPath(); g.ellipse(X, Y - 13 * u, 12 * u, 5 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#7a6040'; g.beginPath(); g.ellipse(X - 2 * u, Y - 16 * u, 8 * u, 2 * u, 0, 0, 7); g.fill();
    g.strokeStyle = '#8a7048'; g.lineWidth = 3.5 * u; g.beginPath(); g.moveTo(X - f * 11 * u, Y - 14 * u); g.quadraticCurveTo(X - f * 18 * u, Y - 12 * u, X - f * 19 * u, Y - 6 * u); g.stroke();
    g.fillStyle = '#a88a58'; g.beginPath(); g.moveTo(X + f * 9 * u, Y - 16 * u); g.lineTo(X + f * 20 * u, Y - 15 * u); g.lineTo(X + f * 11 * u, Y - 22 * u); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(X + f * 10 * u, Y - 21 * u); g.lineTo(X + f * 12 * u, Y - 28 * u); g.lineTo(X + f * 14 * u, Y - 21 * u); g.fill();
    g.fillStyle = nt ? '#ff3020' : '#1a120a'; g.beginPath(); g.arc(X + f * 14 * u, Y - 18 * u, (nt ? 1.6 : 1) * u, 0, 7); g.fill();
  }
  // il mammut, i conigli e gli sciacalli si disegnano come persone in piu' (senza nome); il mammut ha il riquadro grande
  function extras(G) {
    const out = [], m = G.mm; if (!G.tr || !m) return out;
    // amici: movimento fluido (cqNetGlide, col tempo vero tra un disegno e l'altro: prima era un passo fisso a ogni disegno, piu' lento col 🔋)
    const lerp = o => { if (o.tx == null || !G.guest) return; const now = performance.now(), dt = Math.min(0.05, (now - (o.gT || now)) / 1000); o.gT = now; o.gdt = dt; cqNetGlide(o, dt); };   // gdt: per le zampe (al passo col tempo vero)
    if (G.guest) { lerp(m); if (m.mv) m.walk = (m.walk || 0) + (m.gdt || 0) * 15; }
    m.walkA = m.walk || 0;
    const md = (g, X, Y, TW) => drawMammoth(g, X, Y, TW, m); md.big = 1;
    if (!G.me.alive || mmShown(G, cq.x, cq.y)) out.push({ x: m.x, y: m.y, dr: md, name: null, mam: 1 });   // di giorno nella foschia si vede solo da vicino
    for (const r of G.rab) { lerp(r); if (G.guest) r.walk = (r.walk || 0) + (r.gdt || 0) * 18; out.push({ x: r.x, y: r.y, dr: (g, X, Y, TW) => drawRabbit(g, X, Y, TW, r), name: null }); }
    for (const j of G.jk) { lerp(j); if (G.guest) j.walk = (j.walk || 0) + (j.gdt || 0) * 18; out.push({ x: j.x, y: j.y, dr: (g, X, Y, TW) => drawJackal(g, X, Y, TW, j), name: null, all: 1 }); }   // all: sempre disegnati, li copre il buio (niente comparse a scatti al bordo della luce)
    return out;
  }
  // le pitture rupestri: cosa raccontano di QUESTO mammut (direzioni viste da qui, come sullo schermo); sulla mappa grande compaiono le ⭐
  function paintUI(G) {
    const M = MP(), L = LM(), fv = M.fav || {}, pl = L.paint; if (!pl) return;
    const w = (x, y) => { const d = Math.hypot(x - pl.x, y - pl.y); return '<b>' + IZ.dir(x - pl.x, y - pl.y) + '</b>' + (d > 45 ? ', molto lontano' : d > 22 ? ', lontano' : ', non lontano'); };
    const e = M.places.eat[fv.eat], dr = fv.drink === -1 ? null : M.places.drink[fv.drink], sl = fv.sleep === -1 ? null : M.places.sleep[fv.sleep];
    const h = '<div class="t">🎨 Le pitture degli antichi cacciatori</div><p>Raccontano le abitudini di questo mammut:</p>'
      + (e ? '<p>🌾 Mangia volentieri in un pascolo ' + w(e[0] + 0.5, e[1] + 0.5) + '.</p>' : '')
      + '<p>💧 ' + (dr ? 'Beve volentieri ' + w(dr[0] + 0.5, dr[1] + 0.5) : 'Ogni tanto scende a bere alla <b>Radura delle lucciole</b> (' + w(L.glade.x, L.glade.y) + '), ma poi per un po\' non ci torna') + '.</p>'
      + '<p>🌳 ' + (sl ? 'Riposa e dorme ' + w(sl[0] + 0.5, sl[1] + 0.5) : 'Riposa all\'ombra dell\'<b>Albero millenario</b> (' + w(L.gtree.x, L.gtree.y) + ')') + '.</p>'
      + '<p class="n">Sulla mappa grande ora vedi ⭐ questi posti. Dopo aver mangiato ha sete; nelle ore calde cerca ombra; al tramonto va a dormire.</p><div class="c">Tocca per chiudere</div>';
    G.fav = 1; const el = document.getElementById('mmPaint'); if (!el) return; el.innerHTML = h; el.hidden = false; beep(520, 0.1, 0.03); beep(660, 0.14, 0.03, 0.1);
  }
  // COME SI GIOCA: riassunto completo ma corto (nelle impostazioni, da solo all'inizio delle prime partite, e col pulsante ❓ in partita)
  const HELP = [
    ['🎯', 'Lo scopo', 'Abbattete il mammut e portate al fuoco del campo <b>4 pezzi di carne</b> prima che migri (alla fine dell\'ultima notte).'],
    ['🔍', 'Trovarlo', 'Nella foschia si vede solo da vicino. Seguite le <b>tracce</b>: passateci sopra e leggete cosa dicono (fresche o vecchie, dove va, cosa farà dopo). Aiutano anche i <b>barriti</b>, la vedetta 🗿 e le pitture 🎨 (le sue abitudini). Col vento 💨 alle spalle vi fiuta.'],
    ['🦣', 'Abbatterlo', 'Le <b>lance</b> 🎯 lo feriscono solo fino allo scudo 🛡️. Per finirlo: scavate una <b>fossa</b> ⛏️ in due, poi spingetelo dentro con le <b>urla</b> 📣 dalla parte opposta; oppure <b>circondatelo</b> (4 da lati diversi, meno se ha l\'acqua alle spalle). Quando si libera carica: ❗ = spostati di lato!'],
    ['🐇', 'Cibo', 'I <b>conigli</b> stanno vicino alle tane: <b>corrigli addosso</b> per prenderli (scappano verso la tana: arriva dalla parte della tana). Massimo 2, portali al fuoco. Ogni notte ne serve <b>uno a testa</b>, se no il giorno dopo si è più lenti.'],
    ['🔥', 'La notte', 'Il fuoco brucia tanta legna: <b>tagliate alberi</b> 🪓 (3 tronchi in mano; se il fuoco è pieno li tenete per dopo). Gli <b>sciacalli</b> (occhi rossi) attaccano chi è al buio o al bordo della luce: sicuri <b>vicino alle fiamme</b>, con la torcia o nei rifugi ✨♨️🪨.'],
    ['🤕', 'A terra', 'Chi viene travolto o azzannato resta a terra 30 s: un compagno <b>vicino</b> lo rialza.'],
    ['🍖', 'La carne', 'Abbattuto il mammut: 🔪 macellatelo, poi un pezzo a testa (si va piano) fino al fuoco. Gli sciacalli la sentono!']
  ];
  const helpHtml = () => HELP.map(([i, t, d]) => '<p><b>' + i + ' ' + t + '</b><br>' + d + '</p>').join('') + '<p class="n">Tasti sul PC: Q lancia · R urla · M mappa · E azione</p>';
  function helpUI(on) { const el = document.getElementById('mmHelp'); if (!el) return; if (on) { el.innerHTML = '<div class="t">📖 Caccia al mammut: come si gioca</div>' + helpHtml() + '<div class="c">Tocca per chiudere</div>'; el.scrollTop = 0; } el.hidden = !on; }
  // pulsanti a sinistra: 🎯 lancia (Q) e 📣 urla (R)
  function sideHud(G) {
    const b = document.getElementById('mmThrow'), s = document.getElementById('mmShout'); if (!b || !s) return;
    const me = G.me, tg = me.alive && !me.dn ? throwTarget(G, me) : null, n = me.sp || 0, on = !!(tg && n > 0 && (me.thT || 0) <= G.time);
    const t = '🎯' + n; if (b.textContent !== t) b.textContent = t; if (b.classList.contains('on') !== on) b.classList.toggle('on', on);
    const so = me.alive && !me.dn && (me.shT || 0) <= G.time, st = so ? '📣' : '📣' + Math.ceil((me.shT || 0) - G.time); if (s.textContent !== st) s.textContent = st; if (s.classList.contains('on') !== so) s.classList.toggle('on', so);
  }
  function throwBtn() { const G = cq.g; if (!G || G.mode !== 'mammut' || G.phase !== 'play' || G.pre > 0) return; const me = G.me; if (!throwTarget(G, me) || (me.sp || 0) <= 0) { beep(180, 0.05, 0.03); return; } if (G.guest) { cqNetSend({ k: 'th' }); me.thT = G.time + 1.1; } else doThrow(G, me, 'any'); }
  function shoutBtn() { const G = cq.g; if (!G || G.mode !== 'mammut' || G.phase !== 'play' || G.pre > 0) return; const me = G.me; if ((me.shT || 0) > G.time || !me.alive || me.dn) return; [300, 260, 330].forEach((f, i) => beep(f, 0.12, 0.05, i * 0.08)); if (G.guest) { cqNetSend({ k: 'sh' }); me.shT = G.time + SHOUT_CD; G.shouts.push([cq.x, cq.y, G.time, me.id]); } else doShout(G, me); }
  if (!document.getElementById('mmCss')) {
    const st = document.createElement('style'); st.id = 'mmCss';
    st.textContent = '#mmThrow,#mmShout{position:absolute;border-radius:50%;border:0;font:inherit;font-weight:800;background:#5d6578;color:#c9ccd4;box-shadow:0 4px 14px rgba(0,0,0,.35);touch-action:none;user-select:none;-webkit-user-select:none}#mmThrow{left:18px;bottom:142px;width:86px;height:86px;font-size:24px}#mmShout{left:112px;bottom:150px;width:62px;height:62px;font-size:19px}#mmThrow.on{background:#b8662a;color:#fff}#mmShout.on{background:#8a6a2a;color:#fff}#mmPaint{position:absolute;left:14px;right:14px;top:150px;max-width:460px;margin:0 auto;background:rgba(36,26,16,.95);border:2px solid #c8a060;border-radius:16px;padding:14px 16px;color:#f4e8cc;font-size:15px;line-height:1.45;z-index:30;box-shadow:0 8px 30px rgba(0,0,0,.5)}#mmPaint .t{font-weight:800;font-size:17px;color:#ffd88a;margin-bottom:4px}#mmPaint p{margin:6px 0}#mmPaint .n{font-size:13px;color:#d8c8a4}#mmPaint .c{text-align:center;font-size:12px;color:#b8a882;margin-top:8px}'
      + '#mmHelp{position:absolute;left:12px;right:12px;top:118px;bottom:150px;max-width:480px;margin:0 auto;overflow-y:auto;background:rgba(36,26,16,.96);border:2px solid #c8a060;border-radius:16px;padding:12px 16px;color:#f4e8cc;font-size:14px;line-height:1.4;z-index:31;box-shadow:0 8px 30px rgba(0,0,0,.5)}#mmHelp .t{font-weight:800;font-size:17px;color:#ffd88a;margin-bottom:4px}#mmHelp p{margin:7px 0}#mmHelp b{color:#ffe0a0}#mmHelp .n{font-size:12px;color:#c8b894}#mmHelp .c{text-align:center;font-size:13px;color:#ffd88a;font-weight:700;margin-top:10px}'
      + '#mmHelpB{position:absolute;left:14px;top:244px;width:42px;height:42px;border-radius:50%;border:0;background:rgba(36,26,16,.85);color:#ffd88a;font-size:20px;font-weight:800;box-shadow:0 3px 10px rgba(0,0,0,.35)}'
      + '.mmHow summary{cursor:pointer}.mmHow p{margin:8px 0;font-size:14px;line-height:1.4}.mmHow .n{font-size:12px;opacity:.75}';
    document.head.appendChild(st);
    const host = document.getElementById('ciack');
    const mk = (id, fn) => { const b = document.createElement('button'); b.id = id; b.type = 'button'; b.hidden = true; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); }); if (host) host.appendChild(b); return b; };
    const tb = mk('mmThrow', throwBtn), sb = mk('mmShout', shoutBtn);
    const pp = document.createElement('div'); pp.id = 'mmPaint'; pp.hidden = true; pp.addEventListener('pointerdown', e => { e.stopPropagation(); pp.hidden = true; }); if (host) host.appendChild(pp);
    // spiegazione: si chiude toccandola (ma si puo' scorrere col dito); pulsante ❓ per riaprirla
    const hp = document.createElement('div'); hp.id = 'mmHelp'; hp.hidden = true; let hy = 0;
    hp.addEventListener('pointerdown', e => { e.stopPropagation(); hy = e.clientY; });
    hp.addEventListener('pointerup', e => { e.stopPropagation(); if (Math.abs(e.clientY - hy) < 8) helpUI(false); });
    hp.addEventListener('touchmove', e => e.stopPropagation(), { passive: true }); if (host) host.appendChild(hp);
    const hb = document.createElement('button'); hb.id = 'mmHelpB'; hb.type = 'button'; hb.hidden = true; hb.textContent = '❓';
    hb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); helpUI(hp.hidden); }); if (host) host.appendChild(hb);
    // all'inizio delle prime 3 partite (su questo telefono) la spiegazione si apre da sola; giocando da soli la partita aspetta che la chiudi
    setInterval(() => {
      const G = cq.g, on = !!(G && G.mode === 'mammut' && G.phase === 'play' && G.tr && $('#cqTask').hidden && !$('#ciack').hidden);
      if (hb.hidden === on) hb.hidden = !on;
      if (!on) { if (!hp.hidden) hp.hidden = true; return; }
      if (!G.helpAuto) { G.helpAuto = 1; let n = 0; try { n = +localStorage.getItem('mmHelpN') || 0; localStorage.setItem('mmHelpN', n + 1); } catch {} if (n < 3) { helpUI(true); G.helpHold = !cq.net; } }
      if (G.helpHold) { if (hp.hidden) G.helpHold = 0; else G.pre = Math.max(G.pre || 0, 1); }
    }, 200);
    const mb = document.createElement('button'); mb.id = 'mmMap'; mb.type = 'button'; mb.hidden = true; mb.style.cssText = 'position:absolute;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent';
    mb.onclick = e => { e.stopPropagation(); const G = cq.g; if (G && G.mode === 'mammut') { G.big = !G.big; beep(G.big ? 700 : 500, 0.05, 0.02); } }; if (host) host.appendChild(mb);
    window.addEventListener('keydown', e => { if (e.key && e.key.toLowerCase() === 'm' && cq.g && cq.g.mode === 'mammut' && cq.on) cq.g.big = !cq.g.big; });
    setInterval(() => { const G = cq.g, on = !!(G && G.mode === 'mammut' && G.phase === 'play' && G.tr && $('#cqTask').hidden && !$('#ciack').hidden); if (mb.hidden === on) mb.hidden = !on; if (!on) return;
      const W2 = cq.w, H2 = cq.h; let css; if (G.big) { const R = Math.min(W2 - 24, H2 - 300, 460) / 2, cy = Math.max(130 + R, H2 / 2 - 40); css = 'left:' + (W2 / 2 - R) + 'px;top:' + (cy - R) + 'px;width:' + 2 * R + 'px;height:' + 2 * R + 'px'; } else css = 'left:' + (W2 - 2 * RADAR - 8) + 'px;top:122px;width:' + 2 * RADAR + 'px;height:' + 2 * RADAR + 'px';
      if (mb.dataset.k !== css) { mb.dataset.k = css; mb.style.left = mb.style.top = ''; mb.style.cssText = 'position:absolute;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:50%;' + css; } }, 250);
    window.addEventListener('keydown', e => { const k = e.key && e.key.toLowerCase(); if (!cq.g || cq.g.mode !== 'mammut' || !cq.on) return; if (k === 'q') throwBtn(); else if (k === 'r') shoutBtn(); });
    setInterval(() => { const G = cq.g, live = !!(G && G.mode === 'mammut' && G.phase === 'play' && G.tr && G.pre <= 0 && G.me.alive && $('#cqTask').hidden && !$('#ciack').hidden); if (tb.hidden === live) { tb.hidden = !live; sb.hidden = !live; } if (!live && !pp.hidden) pp.hidden = true; }, 300);
  }
  window.__mm = { mmTick, doThrow, doShout, knock, cyc, dark, trackTxt, mmFleeFrom, mmFloor };
});
