// ==== BILIARDO (8-ball) NELLA HALL (23-10-2026, piano in CLAUDE.md "PIANO PASSATEMPI DELLA HALL", sessione 2) ====
// Tavolo nell'angolo giochi (prop 'pool', x R-12..R-9, y 7-8). Partita a tutto schermo vista dall'alto, tavolo in verticale (50 x 100 unita').
// Mira e forza come 8 Ball Pool (vedi "Comandi" sotto); online la mira di chi tira si vede in diretta (vedi "MIRA IN DIRETTA"). Si puo' giocare a soldi: posta 10/25/50 monete a testa, chi vince prende tutto (giochi/lib/tavolo.js).
// Fisica: passi fissi di 1/240 s con solo + - * / e radici (uguale su tutti i telefoni). Il banco (giochi/lib/tavolo.js) riceve il tiro {dx, dy, p, cb},
// lo simula fino in fondo, applica le regole e pubblica lo stato con le palle di partenza del tiro: ogni telefono rifa' la stessa simulazione per
// l'animazione e alla fine si mette sulle posizioni del banco. Regole: piene (1-7) / spezzate (9-15) assegnate alla prima palla imbucata dopo
// l'apertura, si continua se si imbuca una propria palla, falli (nessuna palla colpita, prima l'altro gruppo o la nera, bianca in buca) = palla in mano
// all'altro, la nera per ultima (prima del tempo o con fallo = sconfitta). Nera in buca all'apertura: torna al suo posto.
window.BI = (() => {
  const W = 50, H = 100, BR = 1.55, VMAX = 235, DT = 1 / 240, KIT = 75, FOOT = [25, 27];
  const PK = [[-0.5, -0.5, 3.4], [50.5, -0.5, 3.4], [-0.5, 100.5, 3.4], [50.5, 100.5, 3.4], [-1.3, 50, 3.1], [51.3, 50, 3.1]];
  const COL = ['#f4f0e6', '#f2c230', '#2a5ad8', '#d8342a', '#6a3aa8', '#f08a24', '#2e8a44', '#8a2a2a', '#1a1a1a'];
  const colOf = id => COL[id > 8 ? id - 8 : id];
  const mouthX = y => y < 4.2 || y > H - 4.2 || Math.abs(y - 50) < 3.3;   // sui lati lunghi: buche negli angoli e a meta'
  const mouthY = x => x < 4.2 || x > W - 4.2;
  const r3 = v => Math.round(v * 1000) / 1000;

  // ---- fisica ----
  function makeSim(b0, dx, dy, p) {
    const B = b0.map(([id, x, y]) => ({ id, x, y, vx: 0, vy: 0, in: false }));
    const cue = B.find(b => b.id === 0); if (cue) { cue.vx = dx * p * VMAX; cue.vy = dy * p * VMAX; }
    const ev = { first: null, pots: [], hits: 0, rails: 0, n: 0, snd: [] };
    let done = false;
    function step() {
      if (done) return;
      ev.n++;
      let moving = false;
      for (const b of B) {
        if (b.in) continue;
        const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (s > 0) { const ns = Math.max(0, s - (11 + s * 0.55) * DT), k = ns / s; b.vx *= k; b.vy *= k; if (ns > 0.4) moving = true; else { b.vx = 0; b.vy = 0; } }
        b.x += b.vx * DT; b.y += b.vy * DT;
        if (b.x < BR && !mouthX(b.y)) { b.x = BR + (BR - b.x); b.vx = -b.vx * 0.78; ev.rails++; ev.snd.push(['r', Math.abs(b.vx)]); }
        if (b.x > W - BR && !mouthX(b.y)) { b.x = W - BR - (b.x - W + BR); b.vx = -b.vx * 0.78; ev.rails++; ev.snd.push(['r', Math.abs(b.vx)]); }
        if (b.y < BR && !mouthY(b.x)) { b.y = BR + (BR - b.y); b.vy = -b.vy * 0.78; ev.rails++; ev.snd.push(['r', Math.abs(b.vy)]); }
        if (b.y > H - BR && !mouthY(b.x)) { b.y = H - BR - (b.y - H + BR); b.vy = -b.vy * 0.78; ev.rails++; ev.snd.push(['r', Math.abs(b.vy)]); }
        for (const [px, py, pr] of PK) { const ddx = b.x - px, ddy = b.y - py; if (ddx * ddx + ddy * ddy < pr * pr) { b.in = true; b.vx = b.vy = 0; ev.pots.push(b.id); ev.snd.push(['p', 1]); break; } }
        if (!b.in && (b.x < -3 || b.x > W + 3 || b.y < -3 || b.y > H + 3)) { b.in = true; b.vx = b.vy = 0; ev.pots.push(b.id); ev.snd.push(['p', 1]); }
      }
      for (let i = 0; i < B.length; i++) {
        const a = B[i]; if (a.in) continue;
        for (let j = i + 1; j < B.length; j++) {
          const c = B[j]; if (c.in) continue;
          const dx2 = c.x - a.x, dy2 = c.y - a.y, d2 = dx2 * dx2 + dy2 * dy2;
          if (d2 >= 4 * BR * BR || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx2 / d, ny = dy2 / d, rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          const ov = (2 * BR - d) / 2; a.x -= nx * ov; a.y -= ny * ov; c.x += nx * ov; c.y += ny * ov;
          if (rv < 0) {
            const j2 = -(1 + 0.95) * rv / 2; a.vx -= j2 * nx; a.vy -= j2 * ny; c.vx += j2 * nx; c.vy += j2 * ny; moving = true; ev.hits++; ev.snd.push(['b', -rv]);
            if (ev.first == null) { if (a.id === 0) ev.first = c.id; else if (c.id === 0) ev.first = a.id; }
          }
        }
      }
      if (!moving || ev.n > 6000) { done = true; for (const b of B) { b.vx = b.vy = 0; } }
    }
    return { B, ev, step, get done() { return done; } };
  }
  function simAll(b0, dx, dy, p) { const s = makeSim(b0, dx, dy, p); while (!s.done) s.step(); return s; }

  // ---- regole ----
  function rack() {
    const ids = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15].sort(() => Math.random() - 0.5);
    // dietro: un angolo pieno e uno spezzato; la nera al centro della terza fila
    const sol = ids.findIndex(i => i < 8), a = ids.splice(sol, 1)[0], st = ids.findIndex(i => i > 8), c = ids.splice(st, 1)[0];
    const out = [[0, 25, 76]], rowH = BR * 2 * 0.866 + 0.02;
    let k = 0;
    for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) {
      const x = 25 + (i - row / 2) * (BR * 2 + 0.02), y = 30 - row * rowH;
      let id; if (row === 2 && i === 1) id = 8; else if (row === 4 && i === 0) id = a; else if (row === 4 && i === 4) id = c; else id = ids[k++];
      out.push([id, r3(x), r3(y)]);
    }
    return out;
  }
  const grpName = g => g === 'pi' ? 'piene' : 'spezzate';
  const ownOf = (g, id) => g === 'pi' ? id >= 1 && id <= 7 : g === 'sp' ? id >= 9 && id <= 15 : id !== 0 && id !== 8;
  const left = (S, g) => S.b.filter(([id]) => ownOf(g, id)).length;
  function newMatch(S0) {
    const f = S0.f == null ? 0 : 1 - S0.f;
    return { b: rack(), pot: [], grp: [null, null], tu: f, bih: 1, kit: 1, brk: 1, msg: '', shot: null, sid: (S0.sid || 0) + 1, win: null, why: '' };
  }
  const free = (S, x, y, kit) => x > BR && x < W - BR && y > BR && y < H - BR && (!kit || y > KIT) && S.b.every(([id, bx, by]) => id === 0 || (bx - x) * (bx - x) + (by - y) * (by - y) > 4 * BR * BR * 1.02);
  function act(T, seat, a) {
    const S = T.S;
    if (a.k !== 'shot' || S.ph !== 'play' || seat !== S.tu) return false;
    let dx = +a.dx || 0, dy = +a.dy || 0; const l = Math.sqrt(dx * dx + dy * dy); if (!(l > 0)) return false;
    dx = Math.round(dx / l * 10000) / 10000; dy = Math.round(dy / l * 10000) / 10000;
    const p = Math.round(Math.max(0.05, Math.min(1, +a.p || 0)) * 1000) / 1000;
    if (S.bih && a.cb && free(S, +a.cb[0], +a.cb[1], S.kit)) { const c = S.b.find(b => b[0] === 0); c[1] = r3(+a.cb[0]); c[2] = r3(+a.cb[1]); }
    const b0 = S.b.map(b => b.slice()), sim = simAll(b0, dx, dy, p), ev = sim.ev, me = seat, opp = 1 - me, g = S.grp[me];
    const ownBefore = g ? left(S, g) : 7;
    S.b = sim.B.filter(b => !b.in).map(b => [b.id, r3(b.x), r3(b.y)]);
    const pots = ev.pots, cuePot = pots.includes(0), eight = pots.includes(8), objs = pots.filter(id => id !== 0 && id !== 8);
    for (const id of objs) S.pot.push(id);
    let foul = '';
    if (ev.first == null) foul = 'non hai colpito nessuna palla';
    else if (g && !ownOf(g, ev.first) && !(ev.first === 8 && ownBefore === 0)) foul = 'hai colpito prima una palla dell\'altro';
    else if (!g && ev.first === 8 && !S.brk) foul = 'hai colpito prima la nera';
    if (cuePot) foul = 'bianca in buca';
    S.shot = { id: S.sid = (S.sid || 0) + 1, b0, dx, dy, p, dur: Math.round(ev.n * DT * 100) / 100, by: me };
    S.msg = ''; S.bih = 0; S.kit = 0;
    if (eight) {
      if (S.brk && !cuePot) { const [fx, fy] = FOOT; let y = fy; while (!free(S, fx, y)) y -= 0.5; S.b.push([8, fx, r3(y)]); S.msg = '🎱 Nera in buca all\'apertura: torna al suo posto.'; }
      else {
        S.ph = 'end';
        if (g && ownBefore === 0 && !foul) { S.win = me; S.why = '🎱 ' + esc(S.n[me]) + ' ha imbucato la nera!'; }
        else { S.win = opp; S.why = '🎱 Nera in buca ' + (foul ? 'con un fallo' : 'troppo presto') + ': vince ' + esc(S.n[opp]) + '.'; }
        S.brk = 0; return true;
      }
    }
    if (!g && !foul && !S.brk && objs.length) { const ng = objs[0] < 8 ? 'pi' : 'sp'; S.grp[me] = ng; S.grp[opp] = ng === 'pi' ? 'sp' : 'pi'; S.msg = esc(S.n[me]) + ' gioca con le <b>' + grpName(ng) + '</b>!'; }
    const g2 = S.grp[me], cont = !foul && objs.some(id => g2 ? ownOf(g2, id) : true);
    if (cuePot) S.b.push([0, 25, 76]);
    if (foul) { S.tu = opp; S.bih = 1; S.msg = '❌ Fallo: ' + foul + '. Palla in mano a <b>' + esc(S.n[opp]) + '</b>.'; }
    else if (!cont) S.tu = opp;
    S.brk = 0;
    return true;
  }
  // ---- il computer: per ogni sua palla e ogni buca cerca il tiro col taglio piu' dolce e la strada libera ----
  function clearPath(S, x0, y0, x1, y1, skip) {
    const vx = x1 - x0, vy = y1 - y0, L2 = vx * vx + vy * vy;
    for (const [id, bx, by] of S.b) {
      if (skip.includes(id)) continue;
      const t = Math.max(0, Math.min(1, ((bx - x0) * vx + (by - y0) * vy) / L2)), cx = x0 + vx * t - bx, cy = y0 + vy * t - by;
      if (cx * cx + cy * cy < 4 * BR * BR) return false;
    }
    return true;
  }
  function bestShot(S, seat, cx, cy) {
    const g = S.grp[seat], mine = S.b.filter(([id]) => g ? (left(S, g) ? ownOf(g, id) : id === 8) : id !== 0 && id !== 8);
    let best = null;
    for (const [id, bx, by] of mine) for (const [px0, py0] of PK) {
      const px = Math.max(1, Math.min(W - 1, px0)), py = Math.max(1, Math.min(H - 1, py0));
      let nx = px - bx, ny = py - by; const dl = Math.sqrt(nx * nx + ny * ny); nx /= dl; ny /= dl;
      const gx = bx - nx * 2 * BR, gy = by - ny * 2 * BR; let ax = gx - cx, ay = gy - cy; const al = Math.sqrt(ax * ax + ay * ay); if (al < 0.5) continue; ax /= al; ay /= al;
      const cut = ax * nx + ay * ny; if (cut < 0.25) continue;
      if (!clearPath(S, cx, cy, gx, gy, [0, id]) || !clearPath(S, bx, by, px, py, [0, id])) continue;
      const sc = cut * cut * 2 - (al + dl) / 120;
      if (!best || sc > best.sc) best = { sc, dx: ax, dy: ay, p: Math.min(1, 0.28 + (al + dl * 1.3) / 170 + (1 - cut) * 0.3) };
    }
    return best;
  }
  function aiTurn(T) {
    const S = T.S; if (S.ph !== 'play' || S.tu !== S.ai) return null;
    let cue = S.b.find(b => b[0] === 0), cx = cue[1], cy = cue[2], cb = null;
    if (S.brk) return { k: 'shot', dx: (Math.random() - 0.5) * 0.04, dy: -1, p: 0.95 };
    let sh = bestShot(S, S.ai, cx, cy);
    if (S.bih) {   // palla in mano: prova un po' di posti e tiene quello col tiro migliore
      for (let i = 0; i < 60; i++) { const x = 4 + Math.random() * (W - 8), y = (S.kit ? KIT + 2 : 4) + Math.random() * (S.kit ? H - KIT - 6 : H - 8); if (!free(S, x, y, S.kit)) continue; const s2 = bestShot(S, S.ai, x, y); if (s2 && (!sh || s2.sc > sh.sc)) { sh = s2; cb = [r3(x), r3(y)]; cx = x; cy = y; } }
    }
    if (!sh) {   // nessun tiro pulito: colpisce la sua palla piu' vicina
      const g = S.grp[S.ai], t = S.b.filter(([id]) => g ? (left(S, g) ? ownOf(g, id) : id === 8) : id !== 0 && id !== 8).sort((a, b) => Math.hypot(a[1] - cx, a[2] - cy) - Math.hypot(b[1] - cx, b[2] - cy))[0];
      if (!t) return { k: 'shot', dx: 0, dy: -1, p: 0.5 };
      const l = Math.hypot(t[1] - cx, t[2] - cy); sh = { dx: (t[1] - cx) / l, dy: (t[2] - cy) / l, p: 0.55 };
    }
    const e = (Math.random() - 0.5) * 0.045, c = Math.cos(e), s = Math.sin(e);   // la mano del Conte non e' perfetta
    return { k: 'shot', dx: sh.dx * c - sh.dy * s, dy: sh.dx * s + sh.dy * c, p: sh.p, cb };
  }

  // ---- visuale ----
  // Comandi (come 8 Ball Pool, 23-10-2026): trascinando sul panno la stecca GIRA attorno alla bianca seguendo il dito (prendi la stecca e
  // portala dove vuoi, oppure prendi la linea guida); tocco su una palla = mira dritta su quella; rotella sotto il tavolo = mira fine;
  // forza: tira indietro la stecca col dito (dal legno della stecca) oppure la barra a destra, e lascia.
  const PULL = 16;   // quanto si tira indietro la stecca (unita' del tavolo) per la forza piena
  let X = null;
  function view(T) {
    const r = T.root;
    r.style.background = 'radial-gradient(ellipse at 50% 45%,#3a2a20,#120c0a)';
    r.innerHTML = '<canvas></canvas><div class="tvTop"></div><div class="tvHint"></div>';
    T.cv = r.querySelector('canvas'); T.aim = { dx: 0, dy: -1 }; T.pull = null; T.drag = null; T.turn = null; T.fine = null; T.anim = null; T.seen = T.S.shot ? T.S.shot.id : 0;
    T.ori = {}; T.lp = {}; T.bc = {};
    const cv = T.cv;
    cv.addEventListener('pointerdown', e => down(T, e)); cv.addEventListener('pointermove', e => move(T, e)); cv.addEventListener('pointerup', e => up(T, e));
    cv.addEventListener('pointercancel', () => { T.pull = null; T.drag = null; T.turn = null; T.fine = null; T.grab = null; draw(T); });
    T.ro = () => { if (T.root === r) { size(T); draw(T); } }; window.addEventListener('resize', T.ro);
    size(T);
  }
  function size(T) {
    const cv = T.cv, dpr = Math.min(window.devicePixelRatio || 1, 2.5), Wp = cv.clientWidth, Hp = cv.clientHeight;
    cv.width = Math.round(Wp * dpr); cv.height = Math.round(Hp * dpr); T.W = Wp; T.H = Hp; T.dpr = dpr;
    const k = Math.min((Wp - 92) / (W + 8), (Hp - 190) / (H + 8)); T.k = k; T.ox = (Wp - 56) / 2 - W * k / 2 + 4; T.oy = 76 + (Hp - 190 - (H + 8) * k) / 2 + 4 * k;
    const yb = T.oy + (H + 4) * k + 6; T.wh = { x0: T.ox + W * k * 0.08, x1: T.ox + W * k * 0.92, y0: yb + 9, y1: yb + 35 };
    T.bc = {};
  }
  const toS = (T, x, y) => [T.ox + x * T.k, T.oy + y * T.k], toT = (T, px, py) => [(px - T.ox) / T.k, (py - T.oy) / T.k];
  // T.wait: tiro dell'amico mandato al banco e non ancora tornato (24-10-2026: con la rete lenta la stecca tornava pronta e il secondo tiro
  // arrivava al banco dopo il primo e veniva scartato: "tiro e non succede niente"). Dopo 6 s senza risposta si puo' ritirare.
  const waiting = T => !!T.wait && T.wait.sid === T.S.sid && performance.now() - T.wait.t < 6000;
  const myTurn = T => T.S.ph === 'play' && T.me >= 0 && T.S.tu === T.me && !T.anim && !T.strike && !waiting(T);
  const cueOf = T => { const c = T.S.b.find(b => b[0] === 0); return c ? [c[1], c[2]] : [25, 76]; };
  const angOf = T => Math.atan2(T.aim.dy, T.aim.dx);
  const setAng = (T, a) => { T.aim = { dx: Math.cos(a), dy: Math.sin(a) }; };
  function onStick(T, tx, ty) {   // il dito e' sulla stecca? (dietro la bianca, lungo la stecca)
    const [cx, cy] = cueOf(T), rx = cx - tx, ry = cy - ty, along = rx * T.aim.dx + ry * T.aim.dy, side = Math.abs(rx * T.aim.dy - ry * T.aim.dx);
    return along > BR + 0.3 && along < BR + 48 && side < Math.max(2.4, 16 / T.k);
  }
  function down(T, e) {
    if (!myTurn(T)) return;
    e.preventDefault(); try { T.cv.setPointerCapture(e.pointerId); } catch {}
    const px = e.offsetX, py = e.offsetY, [tx, ty] = toT(T, px, py), [cx, cy] = cueOf(T), wh = T.wh;
    if (px > T.W - 56) { T.pull = { bar: 1, y0: py, p: 0 }; loop(T); return; }   // barra della forza
    if (py > wh.y0 - 8 && py < wh.y1 + 10 && px > wh.x0 - 10 && px < wh.x1 + 10) { T.fine = { x0: px, a0: angOf(T) }; return; }   // rotella: mira fine
    if (T.S.bih && Math.hypot(tx - cx, ty - cy) < 4) { T.drag = true; return; }   // palla in mano: sposto la bianca
    // prendo la stecca: tirata indietro = forza, spostata di lato = la giro (decide il primo movimento)
    if (onStick(T, tx, ty)) { T.grab = { s0: (cx - tx) * T.aim.dx + (cy - ty) * T.aim.dy, px, py, a0: Math.atan2(ty - cy, tx - cx), aim0: angOf(T) }; return; }
    T.turn = { a0: Math.atan2(ty - cy, tx - cx), aim0: angOf(T), px, py, moved: false };
  }
  function move(T, e) {
    if (!myTurn(T)) return;
    const px = e.offsetX, py = e.offsetY, [tx, ty] = toT(T, px, py), [cx, cy] = cueOf(T);
    if (T.grab) {
      const G = T.grab, mx = px - G.px, my = py - G.py; if (Math.hypot(mx, my) < 8) return;
      const along = -(mx * T.aim.dx + my * T.aim.dy), side = Math.abs(mx * T.aim.dy - my * T.aim.dx); T.grab = null;
      if (Math.abs(along) >= side) { T.pull = { s0: G.s0, p: 0 }; loop(T); }
      else T.turn = { a0: G.a0, aim0: G.aim0, px: G.px, py: G.py, moved: true };
    }
    if (T.pull) {
      if (T.pull.bar) T.pull.p = Math.max(0, Math.min(1, (py - T.pull.y0) / 200));
      else T.pull.p = Math.max(0, Math.min(1, ((cx - tx) * T.aim.dx + (cy - ty) * T.aim.dy - T.pull.s0) / PULL));
      return;
    }
    if (T.fine) { setAng(T, T.fine.a0 + (px - T.fine.x0) * 0.0022); T.fine.dx = px - T.fine.x0; draw(T); return; }
    if (T.drag) { if (free(T.S, tx, ty, T.S.kit)) { const c = T.S.b.find(b => b[0] === 0); c[1] = tx; c[2] = ty; T.cbMoved = true; } draw(T); return; }
    if (T.turn) {
      const U = T.turn; if (Math.hypot(px - U.px, py - U.py) > 6) U.moved = true;
      if (!U.moved) return;
      if (Math.hypot(tx - cx, ty - cy) < 3) { U.a0 = null; return; }   // troppo vicino alla bianca: l'angolo ballerebbe
      const a = Math.atan2(ty - cy, tx - cx); if (U.a0 == null) { U.a0 = a; U.aim0 = angOf(T); return; }
      setAng(T, U.aim0 + (a - U.a0)); draw(T);
    }
  }
  function up(T, e) {
    if (T.grab) { T.grab = null; return; }
    if (T.drag) { T.drag = false; draw(T); return; }
    if (T.fine) { T.fine = null; draw(T); return; }
    if (T.turn) {   // tocco senza trascinare su una palla: mira dritta su quella
      const U = T.turn; T.turn = null;
      if (!U.moved && e) { const [tx, ty] = toT(T, e.offsetX, e.offsetY), hit = T.S.b.find(([id, bx, by]) => id && Math.hypot(bx - tx, by - ty) < BR * 1.8); if (hit) { const [cx, cy] = cueOf(T), l = Math.hypot(hit[1] - cx, hit[2] - cy); if (l > 0.5) T.aim = { dx: (hit[1] - cx) / l, dy: (hit[2] - cy) / l }; } }
      draw(T); return;
    }
    if (!T.pull) return;
    const p = T.pull.p, bar = T.pull.bar; T.pull = null;
    if (p < 0.04) { hint(T, bar ? 'Tira <b>giù</b> la barra a destra e lasciala!' : 'Tira <b>indietro</b> la stecca e lasciala!'); draw(T); return; }
    // la stecca scatta in avanti, poi parte il tiro
    const [cx, cy] = cueOf(T), sh = { k: 'shot', dx: T.aim.dx, dy: T.aim.dy, p, cb: T.S.bih ? [r3(cx), r3(cy)] : null };
    T.strike = { t: performance.now(), p }; loop(T); sendAim(T, p);
    setTimeout(() => { T.strike = null; if (BIL.T !== T) return; thud(0.3 + p * 0.6, 900); if (!T.host) { T.wait = { sid: T.S.sid, t: performance.now() }; clearTimeout(T.wt); T.wt = setTimeout(() => { if (BIL.T === T) render(T); }, 6100); render(T); } BIL.act(sh); }, 90);
  }
  // MIRA IN DIRETTA (31-10-2026): chi tira scrive ogni 80 ms in cq/<set>/bi/<banco>/l {a angolo, p forza, cb bianca in mano, s posto, sid tiro, st colpo};
  // l'avversario e chi guarda vedono la stecca girare, tirarsi indietro e scattare (movimento ammorbidito in T.ra / T.rp)
  function sendAim(T, st) {
    const N = cq.net; if (!N || !T.key || T.S.ai >= 0 || T.me < 0 || BIL.T !== T) return;
    const [cx, cy] = cueOf(T), v = { a: r3(angOf(T)), p: T.pull ? r3(T.pull.p) : 0, cb: T.S.bih ? [r3(cx), r3(cy)] : 0, s: T.me, sid: T.S.sid };
    if (st) v.st = r3(st);
    const key = JSON.stringify(v); if (!st && key === T.lsK) return;
    const n = performance.now(); clearTimeout(T.lsT);
    if (!st && n - (T.lsAt || 0) < 80) { T.lsT = setTimeout(() => sendAim(T), 85 - (n - T.lsAt)); return; }
    T.lsK = key; T.lsAt = n; cqNetPut(`cq/${N.code}/bi/${T.key}/l`, Object.assign(v, { t: Date.now() }));
  }
  function raw(T, t) {
    const l = t && t.l; if (!l || !T.cv || l.t === T.rlT) return; T.rlT = l.t;
    if (l.s === T.me) return;
    T.rem = { a: +l.a || 0, p: +l.p || 0, cb: l.cb || null, s: l.s, sid: l.sid };
    if (T.ra == null || T.rsid !== l.sid) { T.ra = T.rem.a; T.rp = T.rem.p; T.rsid = l.sid; T.rst = null; }
    if (l.st) T.rst = { t: performance.now(), p: +l.st };
    loop(T);
  }
  const remAim = T => { const S = T.S, R = T.rem; return S.ph === 'play' && !T.anim && R && R.sid === S.sid && R.s === S.tu && S.tu !== T.me ? R : null; };
  function hint(T, h) { const e = T.root.querySelector('.tvHint'); if (e && e.innerHTML !== h) e.innerHTML = h; }
  function render(T) {
    if (!T.root || !T.cv) return;
    const S = T.S;
    if (S.shot && S.shot.id !== T.seen) {   // tiro nuovo: animazione con la stessa fisica del banco
      T.seen = S.shot.id; const sh = S.shot;
      T.anim = { sim: makeSim(sh.b0, sh.dx, sh.dy, sh.p), t: performance.now(), acc: 0, si: 0 };
      if (sh.by !== T.me) thud(0.3 + sh.p * 0.6, 900);
      loop(T);
    }
    const top = T.root.querySelector('.tvTop');
    const gl = i => S.grp[i] ? (S.grp[i] === 'pi' ? '🟡 piene ' : '⚪ spezzate ') + (7 - left(S, S.grp[i])) + '/7' : 'tavolo aperto';
    const pl = i => `<div class="pl${S.ph === 'play' && S.tu === i ? ' on' : ''}">${i === T.me ? '⭐ ' : ''}${esc(S.n[i] || '?')}<br><small>${gl(i)}</small></div>`;
    top.innerHTML = pl(0) + `<div class="mid">🎱${S.bet ? '<br>🪙 ' + 2 * S.bet : ''}${T.watch ? '<br>👀 ' + T.watch : ''}</div>` + pl(1);
    const who = esc(S.n[S.tu] || '');
    const base = S.ph !== 'play' ? '' : T.anim ? '' : waiting(T) ? '🎱 Tiro…' : myTurn(T) ? (S.bih ? '✋ Palla in mano: trascina la bianca' + (S.kit ? ' (sotto la linea)' : '') + '. ' : '') + 'Gira la stecca trascinando sul panno (rotella sotto = mira fine), poi tira indietro la stecca o la barra a destra.' : T.me < 0 ? '👀 Tira ' + who + '.' : 'Tira ' + who + '…';
    hint(T, (S.msg && !T.anim ? S.msg + ' ' : '') + base);
    if (!T.anim) BIL.endBox(esc(S.n[0]) + ' contro ' + esc(S.n[1]));
    draw(T);
  }
  function loop(T) {
    cancelAnimationFrame(T.raf);
    const step = now => {
      if (!BIL.T || BIL.T !== T) return;
      if (T.anim) {
        const A = T.anim, el = Math.min(0.05, (now - A.t) / 1000); A.t = now; A.acc += el / DT * (window.cqFast || 1);   // cqFast: solo per le prove automatiche
        while (A.acc >= 1 && !A.sim.done) { A.sim.step(); A.acc--; }
        const sd = A.sim.ev.snd; for (; A.si < sd.length; A.si++) { const [k, v] = sd[A.si]; if (k === 'b' && v > 6) beep(1500 + Math.random() * 300, 0.025, Math.min(0.05, v / 2500), 0, 'square'); else if (k === 'r' && v > 10) thud(Math.min(0.35, v / 300), 220); else if (k === 'p') { thud(0.6, 140); beep(180, 0.08, 0.04, 0.04, 'sine'); } }
        if (A.sim.done) { T.anim = null; render(T); }
      }
      const R = remAim(T); let rb = false;
      if (R) { const d = Math.atan2(Math.sin(R.a - T.ra), Math.cos(R.a - T.ra)); T.ra += d * 0.3; T.rp += (R.p - T.rp) * 0.35; rb = Math.abs(d) > 0.002 || Math.abs(R.p - T.rp) > 0.003 || (!!T.rst && now - T.rst.t < 150); }
      draw(T);
      if (T.anim || T.pull || T.strike || rb) T.raf = requestAnimationFrame(step);
    };
    T.raf = requestAnimationFrame(step);
  }
  // ---- palle che rotolano: ogni palla ha il suo orientamento (matrice 3x3, solo per il disegno, non tocca la fisica) ----
  // z entra nello schermo, il panno e' dietro la palla: muovendosi di (dx, dy) la palla gira attorno all'asse (dy, -dx, 0) di |d|/BR.
  function roll(T, id, x, y) {
    let M = T.ori[id];
    if (!M) { const a = Math.random() * 6.28, t = (Math.random() - 0.5) * 0.9, c = Math.cos(a), s = Math.sin(a), ct = Math.cos(t), st = Math.sin(t); M = T.ori[id] = [c, -s * ct, s * st, s, c * ct, -c * st, 0, st, ct]; }
    const lp = T.lp[id]; T.lp[id] = [x, y];
    if (!lp) return;
    const dx = x - lp[0], dy = y - lp[1], d = Math.hypot(dx, dy);
    if (d < 1e-4 || d > 8) return;
    const kx = dy / d, ky = -dx / d, th = d / BR, c = Math.cos(th), s = Math.sin(th), C = 1 - c;
    // rotazione di Rodrigues attorno a (kx, ky, 0)
    const R = [c + kx * kx * C, kx * ky * C, ky * s, kx * ky * C, c + ky * ky * C, -kx * s, -ky * s, kx * s, c];
    const N = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) N[i * 3 + j] = R[i * 3] * M[j] + R[i * 3 + 1] * M[3 + j] + R[i * 3 + 2] * M[6 + j];
    T.ori[id] = N; const b = T.bc[id]; if (b) b.dirty = 1;
  }
  const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const RGB = COL.map(hexRGB), WHITE = hexRGB('#f6f2e8');
  const LX = -0.36, LY = -0.46, LZ = -0.81, HX = LX / 1.9, HY = LY / 1.9, HZ = (LZ - 1) / 1.9;   // luce in alto a sinistra, verso chi guarda
  function ballImg(T, id, r) {
    const D = Math.ceil(2 * r * T.dpr) + 2;
    let b = T.bc[id];
    if (!b || b.D !== D) { const cv = document.createElement('canvas'); cv.width = cv.height = D; b = T.bc[id] = { cv, g: cv.getContext('2d'), D, img: null, dirty: 1 }; b.img = b.g.createImageData(D, D); }
    if (!b.dirty) return b.cv;
    b.dirty = 0;
    const M = T.ori[id] || [1, 0, 0, 0, 1, 0, 0, 0, 1], px = b.img.data, rr = r * T.dpr, h = D / 2, base = RGB[id > 8 ? id - 8 : id];
    for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
      const u = (i + 0.5 - h) / rr, v = (j + 0.5 - h) / rr, q = u * u + v * v, o = (j * D + i) * 4;
      if (q > 1.06) { px[o + 3] = 0; continue; }
      const w = Math.sqrt(Math.max(0, 1 - q)), nz = -w;
      // punto della palla (coordinate della palla) = M trasposta * normale
      const bx = M[0] * u + M[3] * v + M[6] * nz, by = M[1] * u + M[4] * v + M[7] * nz, bz = M[2] * u + M[5] * v + M[8] * nz;
      let c;
      if (id === 0) c = WHITE;
      else if (bz > 0.88 || bz < -0.88) c = WHITE;   // i due cerchietti bianchi del numero
      else if (id > 8) c = Math.abs(by) < 0.52 ? base : WHITE;   // spezzate: fascia colorata
      else c = base;
      const df = Math.max(0, u * LX + v * LY + nz * LZ), sp = Math.pow(Math.max(0, u * HX + v * HY + nz * HZ), 38) * 230, sh = 0.42 + 0.68 * df;
      px[o] = Math.min(255, c[0] * sh + sp); px[o + 1] = Math.min(255, c[1] * sh + sp); px[o + 2] = Math.min(255, c[2] * sh + sp);
      px[o + 3] = Math.max(0, Math.min(255, ((1 - Math.sqrt(q)) * rr + 0.5) * 255));
    }
    b.g.putImageData(b.img, 0, 0);
    return b.cv;
  }
  function ball(T, g, x, y, r, id) {
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x + r * 0.25, y + r * 0.3, r, 0, 7); g.fill();
    const im = ballImg(T, id, r), D = im.width / T.dpr; g.drawImage(im, x - D / 2, y - D / 2, D, D);
    if (!id) return;
    // il numero sul cerchietto che guarda verso di noi (piu' piccolo e trasparente quando sta per girare dietro)
    const M = T.ori[id]; if (!M) return;
    for (const sg of [1, -1]) {
      const wx = M[2] * sg, wy = M[5] * sg, wz = M[8] * sg; if (wz > -0.35) continue;
      const f = Math.min(1, (-wz - 0.35) / 0.4);
      g.save(); g.globalAlpha = f; g.translate(x + wx * r, y + wy * r); g.rotate(Math.atan2(M[3], M[0])); g.scale(1, Math.max(0.3, -wz));
      g.fillStyle = '#111'; g.font = `800 ${Math.max(6, r * 0.6)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(id, 0, 0.5);
      g.restore();
    }
  }
  // linea guida: fino alla prima palla (palla fantasma + direzione della palla colpita) o alla prima sponda
  function guide(T, cx, cy, dx, dy) {
    let tb = Infinity, hit = null;
    for (const [id, bx, by] of T.S.b) {
      if (id === 0) continue;
      const fx = cx - bx, fy = cy - by, b = fx * dx + fy * dy, c = fx * fx + fy * fy - 4 * BR * BR, d = b * b - c; if (d < 0) continue;
      const t = -b - Math.sqrt(d); if (t > 0 && t < tb) { tb = t; hit = [bx, by]; }
    }
    const tw = Math.min(dx > 0 ? (W - BR - cx) / dx : dx < 0 ? (BR - cx) / dx : Infinity, dy > 0 ? (H - BR - cy) / dy : dy < 0 ? (BR - cy) / dy : Infinity);
    const t = Math.min(tb, tw);
    return { cx, cy, gx: cx + dx * t, gy: cy + dy * t, hit: tb <= tw ? hit : null };
  }
  function draw(T) {
    if (!T.cv) return;
    const g = T.cv.getContext('2d'), k = T.k, S = T.S;
    g.setTransform(T.dpr, 0, 0, T.dpr, 0, 0); g.clearRect(0, 0, T.W, T.H);
    const [x0, y0] = toS(T, -4, -4), [x1, y1] = toS(T, W + 4, H + 4);
    // sponde di legno, cuscini, panno
    const wg = g.createLinearGradient(x0, 0, x1, 0); wg.addColorStop(0, '#5a3018'); wg.addColorStop(0.5, '#8a4c2a'); wg.addColorStop(1, '#5a3018');
    g.fillStyle = wg; cqRR(g, x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12, 14); g.fill();
    g.fillStyle = '#1e5a34'; const [a0, b0] = toS(T, -1.4, -1.4), [a1, b1] = toS(T, W + 1.4, H + 1.4); g.fillRect(a0, b0, a1 - a0, b1 - b0);
    const [f0, h0] = toS(T, 0, 0), [f1, h1] = toS(T, W, H), fg = g.createRadialGradient((f0 + f1) / 2, (h0 + h1) / 2, 10, (f0 + f1) / 2, (h0 + h1) / 2, (h1 - h0) * 0.7);
    fg.addColorStop(0, '#3a9a5a'); fg.addColorStop(1, '#22703e'); g.fillStyle = fg; g.fillRect(f0, h0, f1 - f0, h1 - h0);
    g.fillStyle = '#e8d8a8'; for (const [dx, dy] of [[12.5, -2.7], [25, -2.7], [37.5, -2.7], [12.5, H + 2.7], [25, H + 2.7], [37.5, H + 2.7], [-2.7, 25], [-2.7, 75], [W + 2.7, 25], [W + 2.7, 75]]) { const [px, py] = toS(T, dx, dy); g.beginPath(); g.arc(px, py, Math.max(1.5, k * 0.45), 0, 7); g.fill(); }
    if (S.kit && S.ph === 'play') { const [l0, ly] = toS(T, 0, KIT), [l1] = toS(T, W, KIT); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(l0, ly); g.lineTo(l1, ly); g.stroke(); g.setLineDash([]); }
    for (const [px, py, pr] of PK) { const [sx, sy] = toS(T, px, py); g.fillStyle = '#0a0806'; g.beginPath(); g.arc(sx, sy, pr * k * 0.92, 0, 7); g.fill(); g.strokeStyle = '#c8a050'; g.lineWidth = 2; g.stroke(); }
    // palle (durante il tiro quelle della simulazione), che girano mentre corrono
    const R = remAim(T);   // l'altro sta mirando: la sua bianca in mano, la sua guida e la sua stecca
    let balls = T.anim ? T.anim.sim.B.filter(b => !b.in).map(b => [b.id, b.x, b.y]) : S.b;
    if (R && R.cb && S.bih) balls = balls.map(b => b[0] === 0 ? [0, R.cb[0], R.cb[1]] : b);
    for (const [id, bx, by] of balls) roll(T, id, bx, by);
    const aiming = myTurn(T) && !T.drag, striking = !!T.strike;
    const aimLine = (cx, cy, dx, dy, al) => {
      const G = guide(T, cx, cy, dx, dy), [sx, sy] = toS(T, G.cx, G.cy), [ex, ey] = toS(T, G.gx, G.gy);
      g.strokeStyle = `rgba(255,255,255,${0.75 * al})`; g.lineWidth = 1.5; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(ex, ey, BR * k, 0, 7); g.stroke();
      if (G.hit) { const nx = G.hit[0] - G.gx, ny = G.hit[1] - G.gy, nl = Math.hypot(nx, ny) || 1, [hx, hy] = toS(T, G.hit[0], G.hit[1]); g.strokeStyle = `rgba(255,240,150,${0.85 * al})`; g.lineWidth = 2; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + nx / nl * 12 * k, hy + ny / nl * 12 * k); g.stroke(); }
    };
    if (aiming) { const [cx, cy] = cueOf(T); aimLine(cx, cy, T.aim.dx, T.aim.dy, 1); }
    const rcue = R ? (R.cb && S.bih ? R.cb : cueOf(T)) : null, rdx = R ? Math.cos(T.ra) : 0, rdy = R ? Math.sin(T.ra) : 0;
    if (R && !(T.rst && performance.now() - T.rst.t > 80)) aimLine(rcue[0], rcue[1], rdx, rdy, 0.6);
    for (const [id, bx, by] of balls) { const [sx, sy] = toS(T, bx, by); ball(T, g, sx, sy, BR * k, id); }
    if (myTurn(T) && S.bih) { const [cx, cy] = cueOf(T), [sx, sy] = toS(T, cx, cy); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.setLineDash([3, 3]); g.beginPath(); g.arc(sx, sy, BR * k + 5, 0, 7); g.stroke(); g.setLineDash([]); }
    // stecca dietro la bianca (si allontana quando la tiri indietro, scatta in avanti quando lasci)
    const stick = (cx, cy, dx, dy, p) => {
      const [sx, sy] = toS(T, cx, cy), back = (BR + 0.6 + p * PULL) * k, len = 46 * k;
      const bx = sx - dx * back, by = sy - dy * back, ex = bx - dx * len, ey = by - dy * len;
      g.lineCap = 'round'; g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = Math.max(4, k * 1.2); g.beginPath(); g.moveTo(bx + 4, by + 5); g.lineTo(ex + 4, ey + 5); g.stroke();
      g.strokeStyle = '#d8b878'; g.lineWidth = Math.max(3, k * 0.9); g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = '#3a2010'; g.lineWidth = Math.max(4, k * 1.2); g.beginPath(); g.moveTo(bx - dx * len * 0.55, by - dy * len * 0.55); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = '#4a8ad8'; g.lineWidth = Math.max(3, k * 0.9); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - dx * 1.2, by - dy * 1.2); g.stroke(); g.lineCap = 'butt';
    };
    if (R) { let p = T.rp; if (T.rst) p = T.rst.p * Math.max(0, 1 - (performance.now() - T.rst.t) / 80); stick(rcue[0], rcue[1], rdx, rdy, p); }
    // la mia stecca, la barra della forza e la rotella
    if (aiming || striking) {
      let p = T.pull ? T.pull.p : 0;
      if (striking) p = T.strike.p * Math.max(0, 1 - (performance.now() - T.strike.t) / 80);
      const [cx, cy] = cueOf(T), [sx, sy] = toS(T, cx, cy);
      stick(cx, cy, T.aim.dx, T.aim.dy, p);
      if (T.pull && !T.pull.bar) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(sx - T.aim.dx * (BR + 0.6) * k, sy - T.aim.dy * (BR + 0.6) * k); g.lineTo(sx - T.aim.dx * (BR + 0.6 + PULL) * k, sy - T.aim.dy * (BR + 0.6 + PULL) * k); g.stroke(); g.setLineDash([]); }
      const zx = T.W - 30, zy = T.H * 0.3, zh = T.H * 0.42;
      g.fillStyle = 'rgba(0,0,0,.55)'; cqRR(g, zx - 14, zy - 22, 28, zh + 34, 12); g.fill();
      const pg = g.createLinearGradient(0, zy, 0, zy + zh); pg.addColorStop(0, '#7bff8a'); pg.addColorStop(0.6, '#ffe14a'); pg.addColorStop(1, '#ff5a3a');
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(zx - 7, zy, 14, zh); g.fillStyle = pg; g.fillRect(zx - 7, zy, 14, zh * p);
      g.fillStyle = '#fff'; g.font = '700 10px system-ui'; g.textAlign = 'center'; g.fillText('FORZA', zx, zy - 9); g.fillText('⬇', zx, zy + zh + 9);
      // rotella della mira fine: righe che scorrono col dito
      const wh = T.wh, ww = wh.x1 - wh.x0, wy = (wh.y0 + wh.y1) / 2;
      g.fillStyle = '#2a1a10'; cqRR(g, wh.x0 - 4, wh.y0 - 3, ww + 8, wh.y1 - wh.y0 + 6, 10); g.fill();
      const rg = g.createLinearGradient(wh.x0, 0, wh.x1, 0); rg.addColorStop(0, '#3a3a40'); rg.addColorStop(0.5, '#9a9aa6'); rg.addColorStop(1, '#3a3a40');
      g.fillStyle = rg; cqRR(g, wh.x0, wh.y0, ww, wh.y1 - wh.y0, 8); g.fill();
      const off = ((angOf(T) / 0.0022) % 14 + 14) % 14; g.strokeStyle = 'rgba(20,20,26,.6)'; g.lineWidth = 2;
      for (let x = wh.x0 + off; x < wh.x1; x += 14) { const f = 1 - Math.abs((x - wh.x0) / ww - 0.5) * 2; g.globalAlpha = 0.25 + f * 0.75; g.beginPath(); g.moveTo(x, wh.y0 + 3); g.lineTo(x, wh.y1 - 3); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = T.fine ? '#ffe14a' : 'rgba(255,255,255,.7)'; g.font = '700 10px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('◀ MIRA FINE ▶', wh.x0 + ww / 2, wy + 0.5);
    }
    if (myTurn(T)) sendAim(T);
  }
  const BIL = cqTable({
    id: 'bi', title: 'Biliardo', emoji: '🎱', aiName: 'Il Conte', rule: '8-ball: piene o spezzate, la nera per ultima', bets: [0, 10, 25, 50],
    near: () => { const R = CQ_W - 2; return cq.x > R - 13.3 && cq.x < R - 7.7 && cq.y > 5.8 && cq.y < 10.2; },
    newMatch, act, aiTurn, aiDelay: T => (((T.S.shot ? T.S.shot.dur : 0) * 1000) + 1400) / (window.cqFast || 1),
    view, render, raw, drop: T => { cancelAnimationFrame(T.raf); clearTimeout(T.lsT); if (T.ro) window.removeEventListener('resize', T.ro); },
  });
  return Object.assign(BIL, { makeSim, simAll, rack, aiTurn: T => aiTurn(T) });
})();
