// Ruba la bandiera al buio (a squadre). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Due squadre (Rossi e Blu) sul set al buio (per ora solo la mappa studio), ognuna con la sua bandiera alla base, ai lati opposti della mappa.
// Si ruba la bandiera nemica passandoci sopra e si segna portandola alla propria base (solo se la propria e' a casa).
// Nella propria meta' si prende chi viene dall'altra squadra: torna alla sua base fermo qualche secondo e, se aveva la bandiera, la lascia cadere.
// Una bandiera a terra la riporta a casa un compagno toccandola (o torna da sola dopo un po').
// Torcia accesa = vedi lontano ma ti vedono da lontano; spenta = vedi poco ma sei quasi invisibile. I compagni si vedono e si sentono sempre.
// MODULO SQUADRE (riusabile per altri giochi a squadre): TEAMS, team(), side(), base, punteggio G.sc.
(() => {
  const TOUCH = 0.75, GRAB = 0.9, HOME = 1.4, ZONE = 2.2, JAIL = 5, SAFE = 2, BACK = 20, CARRY = 1;
  const SEE_ON = 7, SEE_OFF = 3, SEEN_ON = 15, SEEN_OFF = 2.4;   // fin dove vedo (torcia accesa/spenta), fin dove mi vedono i nemici
  const TEAMS = [{ n: 'Rossi', f: 'rossa', c: '#e04848', l: '#ff8a80', e: '🔴' }, { n: 'Blu', f: 'blu', c: '#3d7be0', l: '#8ab8ff', e: '🔵' }];
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const P = c => cqModePos(c);
  const dist = (a, b) => { const p = P(a), q = P(b); return Math.hypot(p.x - q.x, p.y - q.y); };
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const jailed = (G, c) => (c.jail || 0) > G.time;
  const active = G => G.chars.filter(c => c.alive && !jailed(G, c));
  // meta' del campo: 0 = dalla parte della base dei Rossi, 1 = dei Blu (taglio a meta' strada tra le basi)
  const side = (G, x, y) => { const [a, b] = G.B, dx = b.x - a.x, dy = b.y - a.y; return (x - (a.x + b.x) / 2) * dx + (y - (a.y + b.y) / 2) * dy < 0 ? 0 : 1; };
  const holding = (G, c) => G.F.find(f => f.st === 1 && f.c === c.id);
  const fpos = (G, f) => { if (f.st === 1) { const c = byId(G, f.c); if (c) return P(c); } return f.st === 0 ? G.B[f.t] : f; };

  // basi ai due lati lunghi della mappa: le sceglie a caso l'host (sd) e le manda agli amici nello stato (b)
  function place(G, sd) {
    let s = ((sd | 0) ^ 0x5bd1) || 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const area = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!cqCellFree(x, y)) return false; return true; };
    const pick = (x0, x1) => {
      for (let i = 0; i < 4000; i++) { const x = x0 + Math.floor(rnd() * (x1 - x0)), y = 6 + Math.floor(rnd() * (CQ_H - 12)); if (area(x - 1, y - 1, 3, 3)) return { x: x + 0.5, y: y + 0.5 }; }
      return null;
    };
    let A = null, B = null;
    for (let k = 0; k < 30 && !(A && B); k++) {
      A = pick(4, 13); B = pick(CQ_W - 13, CQ_W - 4);
      if (A && B && !cqPath(A.x, A.y, B.x, B.y).length) A = B = null;   // devono essere collegate
    }
    if (!A) A = cqSpot(8, 24); if (!B) B = cqSpot(CQ_W - 9, 24);
    G.B = rnd() < 0.5 ? [A, B] : [B, A];
    G.F = [0, 1].map(t => ({ t, st: 0, c: -1, x: G.B[t].x, y: G.B[t].y, dt: 0 }));
    G.sc = [0, 0]; G.lg = []; G.lgN = 0;
  }
  // una cella libera vicino alla base della squadra t (dove si parte e si torna dopo essere stati presi)
  function spawn(G, t) {
    const b = G.B[t];
    for (let i = 0; i < 80; i++) { const x = Math.floor(b.x + (Math.random() - 0.5) * 7), y = Math.floor(b.y + (Math.random() - 0.5) * 7); if (cqCellFree(x, y) && Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y) > 1.2 && cqPath(b.x, b.y, x + 0.5, y + 0.5).length) return { x: x + 0.5, y: y + 0.5 }; }
    return cqSpot(Math.floor(b.x), Math.floor(b.y));
  }

  // cronaca: l'host scrive cosa succede (G.lg), tutti lo raccontano dal proprio punto di vista
  function say(G, k, a, b, f) { const e = { n: ++G.lgN, k, a, b, f }; G.lg.push(e); if (G.lg.length > 8) G.lg.shift(); show(G, e); }
  function show(G, e) {
    const me = G.me, A = byId(G, e.a), B = byId(G, e.b), an = A ? '<b>' + esc(A.name) + '</b>' : '', bn = B ? '<b>' + esc(B.name) + '</b>' : '', F = TEAMS[e.f] || TEAMS[0], mine = e.f === me.t;
    let t = '';
    if (e.k === 'take') { t = A === me ? '🚩 Hai preso la bandiera ' + F.f + '! Portala alla tua base!' : mine ? '⚠️ ' + an + ' ha rubato la vostra bandiera!' : '🚩 ' + an + ' ha preso la bandiera ' + F.f + '!'; beep(mine ? 330 : 660, 0.12, 0.05); beep(mine ? 262 : 880, 0.18, 0.05, 0.12); }
    else if (e.k === 'score') { const T = TEAMS[A ? A.t : 0]; t = '⭐ Punto ai ' + T.n + '! ' + (A === me ? 'Hai' : an + ' ha') + ' portato a casa la bandiera ' + F.f + '.'; const ok = A && A.t === me.t; beep(ok ? 523 : 330, 0.12, 0.06); beep(ok ? 659 : 294, 0.12, 0.06, 0.12); beep(ok ? 784 : 262, 0.3, 0.06, 0.24); }
    else if (e.k === 'tag') { t = A === me ? '⛓️ ' + bn + ' ti ha preso! Torni alla base.' : B === me ? '👮 Hai preso ' + an + '!' : '⛓️ ' + bn + ' ha preso ' + an + '.'; if (e.f != null) t += ' La bandiera ' + F.f + ' è caduta a terra.'; beep(220, 0.15, 0.06); beep(150, 0.25, 0.06, 0.1); }
    else if (e.k === 'ret') { t = A ? '🏠 ' + (A === me ? 'Hai' : an + ' ha') + ' riportato a casa la bandiera ' + F.f + '.' : '🏠 La bandiera ' + F.f + ' è tornata a casa da sola.'; beep(587, 0.12, 0.04); }
    if (t) cqToast(t);
  }

  function drop(G, f, c) { const p = P(c); f.st = 2; f.c = -1; f.x = p.x; f.y = p.y; f.dt = G.time; }
  function home(G, f, by) { f.st = 0; f.c = -1; f.x = G.B[f.t].x; f.y = G.B[f.t].y; say(G, 'ret', by ? by.id : -1, -1, f.t); }
  function catchIt(G, v, by) {
    const f = holding(G, v); if (f) drop(G, f, v);
    v.jail = G.time + JAIL; v.path = []; by.tg = (by.tg || 0) + 1;
    const p = spawn(G, v.t);
    v.x = p.x; v.y = p.y; if (v === G.me) { cq.x = p.x; cq.y = p.y; }   // un amico si sposta da solo quando lo sa (capply)
    say(G, 'tag', v.id, by.id, f ? f.t : null);
  }

  // ---- personaggi del computer: difensori (girano intorno alla base) e attaccanti (vanno a rubare) ----
  function go(c, x, y) { c.path = cqPath(c.x, c.y, x, y); if (!c.path.length) c.path = [[x, y]]; }
  const sees = (G, b, e) => { const d = dist(b, e); return d < (e.tc ? SEEN_ON : SEEN_OFF + 0.4) || d < (b.tc ? SEE_ON - 0.5 : SEE_OFF); };
  function flee(G, c, th) {
    const q = P(th); let best = null, bs = -1e9;
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * 7, x = Math.floor(c.x + Math.cos(a) * 4), y = Math.floor(c.y + Math.sin(a) * 4); if (!cqCellFree(x, y)) continue;
      const sc = Math.hypot(x + 0.5 - q.x, y + 0.5 - q.y) * 1.5 + (side(G, x + 0.5, y + 0.5) === c.t ? 3 : 0);
      if (sc > bs) { bs = sc; best = { x: x + 0.5, y: y + 0.5 }; }
    }
    if (best) go(c, best.x, best.y);
  }
  function bot(G, c) {
    const t = c.t, my = G.F[t], en = G.F[1 - t], home_ = G.B[t], mine = side(G, c.x, c.y) === t;
    const foes = active(G).filter(e => e.t !== t && sees(G, c, e));
    const f = holding(G, c);
    if (f) {   // ho la bandiera: a casa, scappando da chi mi viene addosso
      c.tc = false;
      const th = foes.filter(e => side(G, c.x, c.y) !== t && dist(c, e) < 3.2).sort((a, b) => dist(c, a) - dist(c, b))[0];
      if (th && Math.random() < 0.5) { flee(G, c, th); c.path = c.path.slice(0, 3); return; }
      if (Math.hypot(c.x - home_.x, c.y - home_.y) > 0.6) go(c, home_.x, home_.y); else c.path = [];
      return;
    }
    // la nostra bandiera: rubata (si insegue chi la porta) o a terra (si riporta)
    if (my.st === 1) { const k = byId(G, my.c); if (k && (c.role === 'd' || dist(c, k) < 9)) { const q = P(k); if (dist(c, k) < 10 || c.role === 'd') { go(c, q.x, q.y); c.tc = true; return; } } }
    if (my.st === 2 && (c.role === 'd' || Math.hypot(my.x - c.x, my.y - c.y) < 12)) { go(c, my.x, my.y); return; }
    if (c.role === 'd') {
      c.tc = true;
      const th = foes.filter(e => side(G, e === G.me ? cq.x : e.x, e === G.me ? cq.y : e.y) === t && Math.hypot(P(e).x - home_.x, P(e).y - home_.y) < 13).sort((a, b) => dist(c, a) - dist(c, b))[0];
      if (th) { const q = P(th); go(c, q.x, q.y); return; }
      if (!c.path.length || Math.random() < 0.08) {   // ronda intorno alla base
        for (let i = 0; i < 12; i++) { const a = Math.random() * 7, r = 2.5 + Math.random() * 3.5, x = Math.floor(home_.x + Math.cos(a) * r), y = Math.floor(home_.y + Math.sin(a) * r); if (cqCellFree(x, y) && side(G, x + 0.5, y + 0.5) === t) { go(c, x + 0.5, y + 0.5); break; } }
      }
      return;
    }
    // attaccante: torcia accesa a casa, spenta in campo nemico
    c.tc = mine && Math.random() < 0.85;
    if (!mine) {
      const th = foes.filter(e => dist(c, e) < 2.8 && !(Math.hypot(c.x - G.B[1 - t].x, c.y - G.B[1 - t].y) < ZONE)).sort((a, b) => dist(c, a) - dist(c, b))[0];
      if (th && Math.random() < 0.7) { flee(G, c, th); c.path = c.path.slice(0, 4); return; }
    }
    if (en.st === 1) {   // la porta un compagno: lo accompagno un po' dietro
      const k = byId(G, en.c), q = k ? P(k) : home_;
      if (Math.hypot(q.x - c.x, q.y - c.y) > 2.5) go(c, q.x, q.y); else c.path = [];
      return;
    }
    const q = fpos(G, en); go(c, q.x, q.y);
  }

  CQ_MODES.bandiera = {
    n: 'Ruba la bandiera',
    desc: '🚩 Due squadre sul set al buio, <b>Rossi</b> e <b>Blu</b>. Ruba la bandiera nemica passandoci sopra e portala alla tua base (la tua deve essere a casa). Nella tua metà prendi chi viene dall\'altra squadra: torna alla sua base e lascia cadere la bandiera. 🔦 Torcia accesa: vedi lontano, ma ti vedono da lontano. Spenta: vedi poco, ma sei quasi invisibile. In vocale i compagni si sentono sempre, i nemici solo da vicino.',
    maps: [['studio', 'Studio al buio']],
    def: { time: 300, pts: 3, map: 'studio', n: 8, fill: true },
    opts: o => `<div class="row"><div class="lbl">Punti per vincere</div>${seg('pts', [[3, '3'], [5, '5']], o.pts)}</div>
      <div class="row"><div class="lbl">Durata</div>${seg('time', [[180, '3:00'], [300, '5:00'], [420, '7:00']], o.time)}</div>`,
    read: d => ({ time: +d.get('time') || 300, pts: +d.get('pts') || 3 }),
    start(G) {
      place(G, 1 + Math.floor(Math.random() * 1e9));
      G.left = G.opt.time || 300;
      const sh = G.chars.slice().sort(() => Math.random() - 0.5);
      sh.forEach((c, i) => { c.t = i % 2; c.tc = false; c.jail = 0; c.safe = 0; c.pt = 0; c.tg = 0; c.st = 0; });
      for (const t of [0, 1]) {   // ruoli del computer: circa un terzo difende
        const bots = sh.filter(c => c.t === t && c.bot), nd = Math.max(1, Math.round(sh.filter(c => c.t === t).length / 3));
        bots.forEach((c, i) => { c.role = i < nd ? 'd' : 'a'; });
      }
      for (const c of G.chars) { const p = spawn(G, c.t); c.x = p.x; c.y = p.y; c.path = []; }
    },
    gstart(G) { place(G, 7); G.left = G.opt.time || 300; for (const c of G.chars) { c.tc = false; c.jail = 0; } },
    intro: G => { const T = TEAMS[G.me.t || 0], E = TEAMS[1 - (G.me.t || 0)]; return T.e + ' Sei nei ' + T.n + ': ruba la bandiera ' + E.f + '!'; },
    speed: c => { const G = cq.g; return jailed(G, c) ? 0 : holding(G, c) ? CARRY : 1; },
    big(G) {
      const me = G.me; if (me.t == null) return '';
      if (jailed(G, me)) return '⛓️ Preso! Riparti tra ' + Math.ceil(me.jail - G.time) + '…';
      if (holding(G, me)) return G.F[me.t].st === 0 ? '🚩 Portala alla tua base!' : '⚠️ Per segnare la vostra bandiera deve essere a casa!';
      return '';
    },
    hud(G) {
      const me = G.me; if (me.t == null) return '🚩 Ruba la bandiera';
      const T = TEAMS[me.t], mine = side(G, cq.x, cq.y) === me.t;
      return `${TEAMS[0].e} ${G.sc[0]} – ${G.sc[1]} ${TEAMS[1].e} · sei nei <b style="color:${T.l}">${T.n}</b> · ${mine ? '🛡️ tua metà' : '⚔️ campo nemico'} · ⏱ ${mmss(Math.max(0, G.left))}`;
    },
    nameCol: c => c.t != null ? TEAMS[c.t].l : null,
    btn(G) { const me = G.me; if (me.t == null) return null; return { t: me.tc ? '🔦 Spegni' : '🔦 Accendi', on: !jailed(G, me) }; },
    act(G) {
      const me = G.me; me.tc = !me.tc; me.tcH = G.time + 1.2; beep(me.tc ? 1200 : 700, 0.04, 0.03);
      if (G.guest) cqNetSend({ k: 'tc', v: me.tc ? 1 : 0 });
    },
    ev(G, c, o) { if (o && o.k === 'tc') c.tc = !!o.v; },
    // voce: i compagni a pieno volume ovunque, i nemici solo da vicino
    voice: (G, c) => c.t === G.me.t ? 1 : null,
    tick(G, dt) {
      G.left -= dt;
      for (const c of G.chars) if (c.jail && c.jail <= G.time) { c.jail = 0; c.safe = G.time + SAFE; }
      // bandiere portate da chi e' stato preso o e' uscito; bandiere a terra che tornano da sole
      for (const f of G.F) {
        if (f.st === 1) { const c = byId(G, f.c); if (!c || !c.alive || jailed(G, c)) { if (c) drop(G, f, c); else home(G, f, null); } }
        if (f.st === 2 && G.time - f.dt > BACK) home(G, f, null);
      }
      const A = active(G);
      for (const c of A) {
        const p = P(c);
        for (const f of G.F) {
          const d = Math.hypot(p.x - (f.st === 0 ? G.B[f.t].x : f.x), p.y - (f.st === 0 ? G.B[f.t].y : f.y));
          if (f.t !== c.t) { if ((f.st === 0 || f.st === 2) && d < GRAB && !holding(G, c)) { f.st = 1; f.c = c.id; c.st = (c.st || 0) + 1; say(G, 'take', c.id, -1, f.t); } }
          else if (f.st === 2 && d < GRAB) home(G, f, c);
        }
        const h = holding(G, c);
        if (h && G.F[c.t].st === 0 && Math.hypot(p.x - G.B[c.t].x, p.y - G.B[c.t].y) < HOME) {
          G.sc[c.t]++; c.pt = (c.pt || 0) + 1; h.st = 0; h.c = -1; h.x = G.B[h.t].x; h.y = G.B[h.t].y;
          say(G, 'score', c.id, -1, h.t);
        }
      }
      // prese: chi e' nella meta' avversaria e viene toccato da un nemico (nella zona della bandiera si e' al sicuro, se non la si porta)
      for (const v of active(G)) {
        const p = P(v); if (side(G, p.x, p.y) === v.t || (v.safe || 0) > G.time) continue;
        if (!holding(G, v) && Math.hypot(p.x - G.B[1 - v.t].x, p.y - G.B[1 - v.t].y) < ZONE) continue;
        const by = active(G).find(e => e.t !== v.t && dist(e, v) < TOUCH);
        if (by) catchIt(G, v, by);
      }
      // computer
      for (const c of G.chars) {
        if (!c.bot || !c.alive) continue;
        if (jailed(G, c)) { c.path = []; c.walk = 0; continue; }
        if ((c.think -= dt) <= 0) { c.think = 0.4 + Math.random() * 0.2; bot(G, c); }
        cqModeStep(c, dt, 0.9 * (holding(G, c) ? CARRY : 1));
      }
      if (G.sc[0] >= (G.opt.pts || 3) || G.sc[1] >= (G.opt.pts || 3) || G.left <= 0) this.finish(G);
    },
    finish(G) {
      const name = c => c.name + (c === G.me ? ' (tu)' : ''), [a, b] = G.sc, w = a > b ? 0 : b > a ? 1 : -1;
      const line = c => [name(c), '— ' + TEAMS[c.t].e + ' ⭐ ' + (c.pt || 0) + ' · 🚩 ' + (c.st || 0) + ' prese · 👮 ' + (c.tg || 0) + ' catture'];
      const score = c => (c.pt || 0) * 10 + (c.st || 0) * 3 + (c.tg || 0) * 2;
      const rank = G.chars.slice().sort((x, y) => (w >= 0 ? (y.t === w) - (x.t === w) : 0) || score(y) - score(x)).map(line);
      const why = TEAMS[0].e + ' Rossi ' + a + ' – ' + b + ' Blu ' + TEAMS[1].e + (G.left <= 0 ? ' · tempo finito.' : '.');
      if (w < 0) cqModeEnd({ t: '🤝 Pareggio!', why, win: [], rank });
      else cqModeEnd({ t: TEAMS[w].e + ' Vincono i ' + TEAMS[w].n + '!', why, win: G.chars.filter(c => c.t === w).map(c => c.id), rank });
    },
    // online: squadra, secondi di attesa dopo una presa, torcia, statistiche
    csnap: c => [c.t, Math.max(0, Math.round(((c.jail || 0) - cq.g.time) * 10) / 10), c.tc ? 1 : 0, c.pt || 0, c.st || 0, c.tg || 0],
    capply(G, c, a) {
      c.t = a[0];
      const was = jailed(G, c); c.jail = a[1] > 0 ? G.time + a[1] : 0;
      if (c === G.me && !was && a[1] > 0) { const p = spawn(G, c.t); cq.x = p.x; cq.y = p.y; }   // preso: torno alla base
      if (!(c === G.me && G.time < (c.tcH || 0))) c.tc = !!a[2];
      c.pt = a[3]; c.st = a[4]; c.tg = a[5];
    },
    snap: G => ({ b: G.B.map(b => [b.x, b.y]), left: Math.round(G.left * 10) / 10, sc: G.sc, f: G.F.map(f => [f.st, f.c, Math.round(f.x * 10) / 10, Math.round(f.y * 10) / 10, Math.round(f.dt * 10) / 10]), lg: G.lg }),
    apply(G, x) {
      G.left = x.left; G.sc = x.sc; if (x.b) G.B = x.b.map(a => ({ x: a[0], y: a[1] }));
      x.f.forEach((a, i) => Object.assign(G.F[i], { st: a[0], c: a[1], x: a[2], y: a[3], dt: a[4] }));
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
    },
    // buio: vedo vicino (lontano con la torcia), i compagni sempre, i nemici con la torcia accesa da lontano
    night(G) {
      const me = G.me, lights = [], on = me.tc && !jailed(G, me);
      for (const t of [0, 1]) lights.push([G.B[t].x, G.B[t].y, 2.8, 0.85]);   // lanterne delle basi
      for (const c of G.chars) {
        if (c === me || !c.alive) continue;
        const d = Math.hypot(c.x - cq.x, c.y - cq.y); if (d > 18) continue;
        if (c.tc) lights.push([c.x, c.y, 3, 0.8]); else if (c.t === me.t) lights.push([c.x, c.y, 1.3, 0.45]);
      }
      if (on) { const l = Math.hypot(cq.wdx || 0, cq.wdy || 0) || 1, dx = (cq.wdx || 0.5) / l, dy = (cq.wdy || 0.5) / l; lights.push([cq.x + dx * 2.8, cq.y + dy * 2.8, 3.6, 0.9]); }
      const R = on ? SEE_ON : SEE_OFF;
      return { a: 0.94, r: on ? 4.6 : 2.4, lights,
        see: (x, y) => {
          const d = Math.hypot(x - cq.x, y - cq.y); if (d < R) return true;
          const c = G.chars.find(o => o.x === x && o.y === y);
          return !!c && (c.t === me.t || (c.tc && d < SEEN_ON));
        } };
    },
    // cerchio della squadra ai piedi, catene a chi e' stato preso
    deco(g, c, X, Y, TW, G, L) {
      if (c.t == null) return;
      g.strokeStyle = TEAMS[c.t].c; g.lineWidth = 2.5; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(X, Y, TW * 0.34, TW * 0.17, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
      if (jailed(G, c)) { g.font = '15px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⛓️', X, Y - cqTop(L) * TW - 22); }
    },
    // sopra alla mappa: linea di meta' campo, basi, bandiere (quella portata solo se si vede chi la porta), freccia verso l'obiettivo
    over(g, G, sx, sy, TW) {
      const me = G.me, W = cq.w, H = cq.h, now = performance.now(), [a, b] = G.B, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      let ux = b.x - a.x, uy = b.y - a.y; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      g.save(); g.setLineDash([10, 10]); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2; g.beginPath();
      g.moveTo(sx(mx - uy * 80, my + ux * 80), sy(mx - uy * 80, my + ux * 80)); g.lineTo(sx(mx + uy * 80, my - ux * 80), sy(mx + uy * 80, my - ux * 80)); g.stroke(); g.restore();
      const ring = (x, y, r) => { g.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI * 2, X = sx(x + Math.cos(t) * r, y + Math.sin(t) * r), Y = sy(x + Math.cos(t) * r, y + Math.sin(t) * r); i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); };
      const MN = this.night(G);
      for (const t of [0, 1]) {
        const B = G.B[t], T = TEAMS[t];
        ring(B.x, B.y, ZONE); g.fillStyle = T.c + '30'; g.fill(); g.strokeStyle = T.c + 'b0'; g.lineWidth = 2; g.stroke();
        for (const s of [-1, 1]) banner(g, sx(B.x + s * 1.6, B.y - s * 1.6), sy(B.x + s * 1.6, B.y - s * 1.6), TW, T.c, now / 1000 + s);
        if (G.F[t].st !== 0) { const X = sx(B.x, B.y), Y = sy(B.x, B.y); g.font = '16px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('❌', X, Y - TW * 0.3); }
      }
      for (const f of G.F) {
        const T = TEAMS[f.t];
        if (f.st === 0) flag(g, sx(G.B[f.t].x, G.B[f.t].y), sy(G.B[f.t].x, G.B[f.t].y), TW, T.c, now / 1000 + f.t);
        else if (f.st === 2) {
          const X = sx(f.x, f.y), Y = sy(f.x, f.y); flag(g, X, Y, TW, T.c, now / 1000, 0.6);
          const k = Math.max(0, 1 - (G.time - f.dt) / BACK); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(X, Y - TW * 1.6, 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
        } else {
          const c = byId(G, f.c); if (!c) continue;
          const p = P(c); if (c !== me && !MN.see(c.x, c.y)) continue;
          flag(g, sx(p.x, p.y) - TW * 0.22, sy(p.x, p.y) - TW * 0.55, TW, T.c, now / 1000, 0.75);
        }
      }
      // freccia sul bordo: con la bandiera verso casa, altrimenti verso la bandiera nemica (o la nostra se e' a terra)
      if (me.t == null || jailed(G, me)) return;
      const mine = G.F[me.t], en = G.F[1 - me.t];
      let q = holding(G, me) ? G.B[me.t] : mine.st === 2 ? mine : en.st === 1 ? G.B[me.t] : fpos(G, en), col = holding(G, me) ? TEAMS[me.t].c : mine.st === 2 ? TEAMS[me.t].c : TEAMS[1 - me.t].c;
      edge(g, sx(q.x, q.y), sy(q.x, q.y) - TW, W, H, holding(G, me) || en.st === 1 ? '🏠' : '🚩', col);
    }
  };

  // bandiera sull'asta che sventola (X, Y = piede dell'asta); k = grandezza
  function flag(g, X, Y, TW, col, t, k = 1) {
    const u = TW / 34 * k, h = 52 * u;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y, 7 * u, 3 * u, 0, 0, 7); g.fill();
    g.fillStyle = '#d8c9a0'; g.fillRect(X - 1.5 * u, Y - h, 3 * u, h); g.fillStyle = '#f2e8c8'; g.beginPath(); g.arc(X, Y - h, 2.6 * u, 0, 7); g.fill();
    const w = 26 * u, fh = 17 * u, top = Y - h + 3 * u, wv = i => Math.sin(t * 6 + i * 2.2) * 3 * u * i;
    g.fillStyle = col; g.beginPath(); g.moveTo(X + 1.5 * u, top);
    for (let i = 1; i <= 4; i++) g.lineTo(X + 1.5 * u + w * i / 4, top + wv(i / 4));
    for (let i = 4; i >= 0; i--) g.lineTo(X + 1.5 * u + w * i / 4, top + fh + wv(i / 4) * 1.2);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(X + 1.5 * u, top); for (let i = 1; i <= 4; i++) g.lineTo(X + 1.5 * u + w * i / 4, top + wv(i / 4)); for (let i = 4; i >= 0; i--) g.lineTo(X + 1.5 * u + w * i / 4, top + 4 * u + wv(i / 4)); g.closePath(); g.fill();
  }
  // stendardo della base: palo con il telo appeso che ondeggia
  function banner(g, X, Y, TW, col, t) {
    const u = TW / 34, h = 40 * u, sw = Math.sin(t * 2.5) * 1.5 * u;
    g.fillStyle = '#5a4128'; g.fillRect(X - 1.5 * u, Y - h, 3 * u, h); g.fillRect(X - 9 * u, Y - h, 18 * u, 2.5 * u);
    g.fillStyle = col; g.beginPath(); g.moveTo(X - 8 * u, Y - h + 2.5 * u); g.lineTo(X + 8 * u, Y - h + 2.5 * u); g.lineTo(X + 8 * u + sw, Y - h + 22 * u); g.lineTo(X + sw, Y - h + 17 * u); g.lineTo(X - 8 * u + sw, Y - h + 22 * u); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(X + sw * 0.5, Y - h + 10 * u, 2.8 * u, 0, 7); g.fill();
  }
  // freccia sul bordo dello schermo verso qualcosa che e' fuori (X, Y = dove sarebbe)
  function edge(g, X, Y, W, H, icon, col) {
    const m = 34, top = 120, bot = H - 140; if (X > m && X < W - m && Y > top && Y < bot) return;
    const cx = W / 2, cy = (top + bot) / 2, dx = X - cx, dy = Y - cy, k = Math.min(Math.abs((W / 2 - m) / (dx || 1e-6)), Math.abs(((bot - top) / 2) / (dy || 1e-6)));
    const ex = cx + dx * k, ey = cy + dy * k, a = Math.atan2(dy, dx);
    g.fillStyle = col; g.beginPath(); g.moveTo(ex + Math.cos(a) * 20, ey + Math.sin(a) * 20); g.lineTo(ex + Math.cos(a + 2.4) * 12, ey + Math.sin(a + 2.4) * 12); g.lineTo(ex + Math.cos(a - 2.4) * 12, ey + Math.sin(a - 2.4) * 12); g.fill();
    g.fillStyle = 'rgba(20,22,28,.85)'; g.beginPath(); g.arc(ex, ey, 13, 0, 7); g.fill();
    g.font = '14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(icon, ex, ey + 1);
  }
})();
