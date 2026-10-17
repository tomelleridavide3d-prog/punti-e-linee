// Il Mostro della notte (asimmetrico, horror leggero). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Di notte nel bosco uno e' il mostro, gli altri riparano 4 generatori e poi scappano col furgone.
// Il mostro e' piu' veloce e vede piu' lontano al buio; chi e' lontano lo trova dai RUMORI: passi, generatori in riparazione, chi parla al microfono.
// I sopravvissuti hanno una torcia con 3 lampi: un lampo in faccia al mostro lo acceca per qualche secondo.
// Vincono i sopravvissuti se scappa almeno la meta' di loro; altrimenti vince il mostro.
(() => {
  const TOUCH = 0.8, WAKE = 8, NGEN = 4, FIX = 30, STUN = 3, FLASH_R = 4.5, FLASH_A = 0.75, FLASHES = 3, FLASH_CD = 5;
  const SEE_M = 6.8, SEE_S = 4.4;   // fin dove si vede al buio: il mostro, i sopravvissuti
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const P = c => cqModePos(c);
  const dist = (a, b) => { const p = P(a), q = P(b); return Math.hypot(p.x - q.x, p.y - q.y); };
  const surv = G => G.chars.filter(c => !c.m);
  const active = G => G.chars.filter(c => !c.m && c.alive);
  const monster = G => G.chars.find(c => c.m);
  const vanC = G => ({ x: G.van.x + 1, y: G.van.y + 0.5 });   // centro del furgone (due celle lungo x)
  const lit = G => G.gens.filter(g => g.on).length;

  // generatori e furgone: posti scelti dal seme della mappa (uguali su tutti i telefoni) e aggiunti alla mappa come oggetti
  function place(G) {
    let s = (cq.mapSeed | 0) || 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const area = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!cqCellFree(x, y)) return false; return true; };
    const camp = { x: 30.5, y: 24.5 }, gens = [];
    for (let gap = 12; gens.length < NGEN && gap >= 4; gap -= 2) {
      for (let i = 0; i < 3000 && gens.length < NGEN; i++) {
        const x = 2 + Math.floor(rnd() * (CQ_W - 4)), y = 2 + Math.floor(rnd() * (CQ_H - 4)), d = Math.hypot(x + 0.5 - camp.x, y + 0.5 - camp.y);
        if (d < 8 || d > 26 || !area(x - 1, y - 1, 3, 3) || gens.some(g => Math.hypot(g.x - x, g.y - y) < gap)) continue;
        gens.push({ x, y });
      }
    }
    let van = null;
    for (let i = 0; i < 4000 && !van; i++) {
      const x = 2 + Math.floor(rnd() * (CQ_W - 5)), y = 2 + Math.floor(rnd() * (CQ_H - 4)), d = Math.hypot(x + 1 - camp.x, y + 0.5 - camp.y);
      if (d < (i < 3000 ? 16 : 10) || !area(x - 1, y - 1, 4, 3) || gens.some(g => Math.hypot(g.x - x, g.y - y) < 6)) continue;
      van = { x, y };
    }
    if (!van) van = { x: 28, y: 29 };
    G.gens = gens.map(g => { const o = { on: false }; CQ_PROPS.push(['mgen', g.x, g.y, o]); cqSolid[g.y][g.x] = { prop: 'mgen', o }; return { x: g.x, y: g.y, p: 0, on: false, o, nt: 0 }; });
    const vo = { on: false };
    CQ_PROPS.push(['van', van.x, van.y, { part: 1 }], ['van', van.x + 1, van.y, vo]);
    cqSolid[van.y][van.x] = { prop: 'van', o: { part: 1 } }; cqSolid[van.y][van.x + 1] = { prop: 'van', o: vo };
    G.van = { x: van.x, y: van.y, o: vo, open: false };
    G.noise = []; G.vn = []; G.fl = [];
  }
  function genOn(G, g) {
    g.on = g.o.on = true; g.p = 1; cqBgCell(g.x, g.y);
    beep(523, 0.12, 0.05); beep(784, 0.2, 0.05, 0.12);
    const n = lit(G); cqToast('⚙️ Generatore acceso! (' + n + ' su ' + NGEN + ')');
  }
  function vanOpen(G) {
    G.van.open = true; G.van.o.on = true; G.openT = G.time; cqBgCell(G.van.x, G.van.y); cqBgCell(G.van.x + 1, G.van.y);
    beep(392, 0.15, 0.06); beep(523, 0.15, 0.06, 0.15); beep(659, 0.3, 0.06, 0.3);
    cqToast(G.me.m ? '🚐 Il furgone è pronto: non farli scappare!' : '🚐 Tutti i generatori accesi: il furgone è pronto! Correte!');
  }
  // lampo della torcia (ang = direzione nel mondo): acceca il mostro se e' davanti e vicino
  function flash(G, c, ang) {
    if (!c.alive || c.m || (c.fl || 0) <= 0 || (c.fcd || 0) > G.time) return;
    c.fl--; c.fcd = G.time + FLASH_CD;
    const p = P(c), Mo = monster(G); G.fl.push({ x: p.x, y: p.y, a: ang, t: G.time });
    if (!Mo || !Mo.alive) return;
    const q = P(Mo), d = Math.hypot(q.x - p.x, q.y - p.y); let a = Math.atan2(q.y - p.y, q.x - p.x) - ang; a = Math.atan2(Math.sin(a), Math.cos(a));
    if (d < FLASH_R && (Math.abs(a) < FLASH_A || d < 1.2)) {
      Mo.stun = G.time + STUN; beep(1500, 0.08, 0.04); beep(300, 0.3, 0.05, 0.05);
      if (Mo === G.me) cqToast('😵 Accecato dalla torcia di <b>' + esc(c.name) + '</b>!'); else if (c === G.me) cqToast('🔦 Hai accecato il mostro: scappa!');
    }
  }
  function noise(G, x, y, r, k) { G.noise.push({ x, y, t: G.time, r, k }); }

  // personaggi del computer
  function go(c, x, y) { c.path = cqPath(c.x, c.y, x, y); if (!c.path.length) c.path = [[x, y]]; }
  function flee(c, th) {
    const p = P(th); let best = null, bs = -1e9;
    for (let i = 0; i < 14; i++) {
      const f = cqModeFree(20); if (!f) continue;
      const sc = Math.hypot(f.x - p.x, f.y - p.y) * 1.4 - Math.hypot(f.x - c.x, f.y - c.y) * 0.5 + ((f.x - c.x) * (c.x - p.x) + (f.y - c.y) * (c.y - p.y) > 0 ? 4 : -4);
      if (sc > bs) { bs = sc; best = f; }
    }
    if (best) c.path = cqPath(c.x, c.y, best.x, best.y).slice(0, 8);
  }
  function botSurv(G, c, Mo) {
    const awake = G.time >= WAKE && Mo.alive, dm = dist(c, Mo);
    if (awake && dm < 4.5 && !(Mo.stun > G.time)) {
      if ((c.fl || 0) > 0 && (c.fcd || 0) <= G.time && dm < 3.4) { const q = P(Mo); flash(G, c, Math.atan2(q.y - c.y, q.x - c.x)); return; }
      flee(c, Mo); return;
    }
    if (G.van.open) { const v = cqSpot(G.van.x + 1, G.van.y); if (Math.hypot(v.x - c.x, v.y - c.y) > 0.4) go(c, v.x, v.y); else c.path = []; return; }
    // il generatore spento piu' vicino (meglio se nessun altro ci sta lavorando)
    let best = null, bs = 1e9;
    for (const g of G.gens) { if (g.on) continue; const others = active(G).filter(o => o !== c && o.bot && o.job === g).length, d = Math.hypot(g.x + 0.5 - c.x, g.y + 0.5 - c.y) + others * 8; if (d < bs) { bs = d; best = g; } }
    c.job = best; if (!best) return;
    const sp = cqSpot(best.x, best.y);
    if (Math.hypot(sp.x - c.x, sp.y - c.y) > 0.5) go(c, sp.x, sp.y); else c.path = [];
  }
  function botMonster(G, c) {
    if (G.time < WAKE || c.stun > G.time) { c.path = []; return; }
    let prey = null, pd = SEE_M;
    for (const s of active(G)) { const d = dist(c, s); if (d < pd) { pd = d; prey = s; } }
    if (prey) { const q = P(prey); go(c, q.x, q.y); return; }
    // nessuno in vista: verso il rumore piu' recente, altrimenti a controllare un generatore spento
    const n = G.noise.filter(o => G.time - o.t < 3 && Math.hypot(o.x - c.x, o.y - c.y) < o.r + 4).sort((a, b) => b.t - a.t)[0];
    if (n) { go(c, n.x, n.y); return; }
    if (!c.path.length) { const gs = G.gens.filter(g => !g.on), g = gs.length ? cqPickOne(gs) : null, f = g ? cqSpot(g.x, g.y) : cqModeFree(); if (f) go(c, f.x, f.y); }
  }

  CQ_MODES.mostro = {
    n: 'Il Mostro della notte',
    desc: '👹 Uno è il <b>mostro</b>: più veloce e vede al buio, ma chi è lontano lo trova solo dai <b>rumori</b> (passi, generatori, chi parla al microfono). Gli altri riparano <b>4 generatori</b> e scappano col <b>furgone</b>. 🔦 La torcia acceca il mostro per qualche secondo (3 lampi).',
    maps: [['bosco', 'Bosco di notte']],
    def: { time: 240, map: 'bosco', n: 6, fill: true },
    opts: o => `<div class="row"><div class="lbl">Durata</div>${seg('time', [[180, '3:00'], [240, '4:00'], [300, '5:00']], o.time)}</div>`,
    read: d => ({ time: +d.get('time') || 240 }),
    start(G) {
      place(G);
      G.left = G.opt.time || 240;
      const m = cqPickOne(G.chars);
      for (const c of G.chars) { c.m = c === m; c.fl = c.m ? 0 : FLASHES; c.fcd = 0; c.stun = 0; c.esc = 0; c.ct = 0; c.job = null; }
      // il mostro parte lontano dall'accampamento
      let best = null, bs = -1; for (let i = 0; i < 80; i++) { const f = cqModeFree(30); if (!f) continue; const d = Math.hypot(f.x - 30.5, f.y - 24.5); if (d > bs) { bs = d; best = f; } if (d > 22) break; }
      if (best) { m.x = best.x; m.y = best.y; }
    },
    gstart(G) { place(G); G.left = G.opt.time || 240; },
    intro: G => G.me.m ? '👹 Sei il MOSTRO: prendili tutti!' : '🔧 Ripara i generatori e scappa col furgone!',
    speed: c => { const G = cq.g; return c.m ? (G.time < WAKE || c.stun > G.time ? 0 : 1.12) : 1; },
    big(G) {
      const me = G.me;
      if (G.time < WAKE) return me.m ? '👹 Ti svegli tra ' + Math.ceil(WAKE - G.time) + '…' : '👹 Il mostro si sveglia tra ' + Math.ceil(WAKE - G.time) + '…';
      if (me.m && me.stun > G.time) return '😵 Accecato!';
      if (G.van.open && G.time - (G.openT || 0) < 4) return me.m ? '🚐 Non farli scappare!' : '🚐 Il furgone è pronto: scappate!';
      return '';
    },
    hud(G) {
      const me = G.me, Mo = monster(G);
      // battito del cuore quando il mostro e' vicino (solo ai sopravvissuti ancora in gioco)
      if (!me.m && me.alive && Mo && G.time >= WAKE && G.phase === 'play') {
        const d = dist(me, Mo), now = performance.now();
        if (d < 8 && now > (G.hb || 0)) { const v = 0.02 + 0.05 * (1 - d / 8); beep(55, 0.09, v); beep(50, 0.11, v * 0.8, 0.16); G.hb = now + 380 + d * 110; }
      }
      return `👹 Mostro · ⚙️ ${lit(G)}/${NGEN} · 👤 ${active(G).length} · 🚐 ${surv(G).filter(c => c.esc).length} · ⏱ ${mmss(Math.max(0, G.left))}`;
    },
    nameCol: c => c.m ? '#ff6a5a' : null,
    tint: c => c.m && c.alive ? { c: '#2a1030', a: 0.62, rot: 0, s: c.id } : null,
    btn(G) { const me = G.me; if (me.m || !me.alive) return null; const n = me.fl || 0; return { t: '🔦 Torcia ' + n, on: n > 0 && (me.fcd || 0) <= G.time }; },
    act(G) {
      const me = G.me; if (me.m || !me.alive || (me.fl || 0) <= 0 || (me.fcd || 0) > G.time) return;
      const ang = Math.atan2(cq.wdy || 0.5, cq.wdx || 0.5);
      if (G.guest) { cqNetSend({ k: 'fl', a: Math.round(ang * 100) / 100 }); me.fcd = G.time + 1; G.fl.push({ x: cq.x, y: cq.y, a: ang, t: G.time }); }
      else flash(G, me, ang);
    },
    ev(G, c, o) { if (o && o.k === 'fl') flash(G, c, +o.a || 0); },
    tick(G, dt) {
      G.left -= dt;
      const Mo = monster(G), live = active(G);
      // passi: chi si muove fa rumore (ogni 1,6 s); il mostro li sente fino a 9 caselle
      for (const c of live) {
        const p = P(c), mv = c.px != null && Math.hypot(p.x - c.px, p.y - c.py) > dt * 1.2; c.px = p.x; c.py = p.y;
        if (mv && (c.nt = (c.nt || 0) - dt) <= 0) { c.nt = 1.6; noise(G, p.x, p.y, 9, 's'); }
      }
      // generatori: si riparano stando vicino (in due si fa prima); fanno rumore mentre si lavora
      for (const g of G.gens) {
        if (g.on) continue;
        if (g.p >= 1) { genOn(G, g); continue; }
        const n = live.filter(c => { const p = P(c); return Math.hypot(p.x - g.x - 0.5, p.y - g.y - 0.5) < 1.5; }).length;
        if (!n) continue;
        g.p += dt / FIX * (n > 1 ? 1.6 : 1);
        if ((g.nt -= dt) <= 0) { g.nt = 2.5; noise(G, g.x + 0.5, g.y + 0.5, 18, 'g'); beep(140, 0.05, 0.015); }
        if (g.p >= 1) genOn(G, g);
      }
      if (!G.van.open && lit(G) >= NGEN) vanOpen(G);
      // fuga col furgone
      if (G.van.open) { const v = vanC(G); for (const c of live) { const p = P(c); if (Math.hypot(p.x - v.x, p.y - v.y) < 1.9) { c.alive = false; c.esc = G.time; c.x = v.x; c.y = v.y; c.path = []; beep(659, 0.12, 0.05); beep(880, 0.2, 0.05, 0.12); cqToast(c === G.me ? '🚐 Sei salito sul furgone: sei salvo!' : '🚐 <b>' + esc(c.name) + '</b> è scappato col furgone!'); } } }
      // il mostro prende chi tocca (poi un attimo di pausa)
      if (Mo && G.time >= WAKE && !(Mo.stun > G.time) && !(Mo.cd > G.time)) {
        const v = active(G).find(c => dist(c, Mo) < TOUCH);
        if (v) {
          v.alive = false; v.ct = G.time; v.path = []; Mo.cd = G.time + 1.5; Mo.got = (Mo.got || 0) + 1;
          beep(180, 0.2, 0.08); beep(90, 0.4, 0.08, 0.1);
          if (v === G.me) cqToast('👹 Il mostro ti ha preso! Ora guardi la partita.'); else if (Mo === G.me) cqToast('👹 Hai preso <b>' + esc(v.name) + '</b>!'); else cqToast('👹 Il mostro ha preso <b>' + esc(v.name) + '</b>!');
        }
      }
      // rumori e lampi vecchi via
      G.noise = G.noise.filter(o => G.time - o.t < 2.5); G.fl = G.fl.filter(f => G.time - f.t < 0.6);
      // computer
      for (const c of G.chars) {
        if (!c.bot || !c.alive) continue;
        if ((c.think -= dt) <= 0) { c.think = 0.45 + Math.random() * 0.2; if (c.m) botMonster(G, c); else botSurv(G, c, Mo); }
        const st = c.m ? (G.time < WAKE || c.stun > G.time ? 0 : 1.02) : 0.9;
        if (st) cqModeStep(c, dt, st);
      }
      if (!active(G).length || G.left <= 0) this.finish(G);
    },
    finish(G) {
      const name = c => c.name + (c === G.me ? ' (tu)' : ''), S = surv(G), es = S.filter(c => c.esc), need = Math.ceil(S.length / 2), Mo = monster(G);
      const rank = es.slice().sort((a, b) => a.esc - b.esc).map(c => [name(c), '— scappato col furgone a ' + mmss(c.esc)])
        .concat(S.filter(c => !c.esc && c.alive).map(c => [name(c), '— rimasto nel bosco']))
        .concat(S.filter(c => c.ct).sort((a, b) => b.ct - a.ct).map(c => [name(c), '— preso dal mostro a ' + mmss(c.ct)]));
      const mr = [name(Mo), '— il mostro: ' + (Mo.got || 0) + ' pres' + ((Mo.got || 0) === 1 ? 'o' : 'i')];
      if (es.length >= need) cqModeEnd({ t: '🚐 Vincono i sopravvissuti!', why: 'Sono scappati in ' + es.length + ' su ' + S.length + ' (ne bastavano ' + need + ').', win: S.map(c => c.id), rank: rank.concat([mr]) });
      else cqModeEnd({ t: '👹 Vince il mostro!', why: (es.length ? 'Sono scappati solo in ' + es.length + ' su ' + S.length + ' (ne servivano ' + need + ').' : 'Nessuno è riuscito a scappare.') + (G.left <= 0 ? ' Il tempo è finito.' : ''), win: [Mo.id], rank: [mr].concat(rank) });
    },
    // online: ruolo (m), scappato (esc), lampi rimasti, secondi di accecamento
    csnap: c => [c.m ? 1 : 0, Math.round((c.esc || 0) * 10) / 10, c.fl || 0, Math.max(0, Math.round(((c.stun || 0) - cq.g.time) * 10) / 10), Math.round((c.ct || 0) * 10) / 10],
    capply(G, c, a) {
      c.m = !!a[0];
      if (a[1] && !c.esc && G.time > 0.5) cqToast(c === G.me ? '🚐 Sei salito sul furgone: sei salvo!' : '🚐 <b>' + esc(c.name) + '</b> è scappato col furgone!');
      if (a[4] && !c.ct && G.time > 0.5) { beep(180, 0.2, 0.08); cqToast(c === G.me ? '👹 Il mostro ti ha preso! Ora guardi la partita.' : '👹 Il mostro ha preso <b>' + esc(c.name) + '</b>!'); }
      c.esc = a[1]; c.fl = a[2]; c.stun = G.time + a[3]; c.ct = a[4];
    },
    snap: G => ({ left: Math.round(G.left * 10) / 10, g: G.gens.map(g => g.on ? 1 : Math.min(0.99, Math.floor(g.p * 100) / 100)), vo: G.van.open ? 1 : 0, ot: G.openT || 0,
      nz: G.noise.map(o => [Math.round(o.x * 10) / 10, Math.round(o.y * 10) / 10, Math.round(o.t * 10) / 10, o.r, o.k]), fl: G.fl.map(f => [Math.round(f.x * 10) / 10, Math.round(f.y * 10) / 10, Math.round(f.a * 100) / 100, Math.round(f.t * 10) / 10]) }),
    apply(G, x) {
      G.left = x.left; G.openT = x.ot;
      x.g.forEach((p, i) => { const g = G.gens[i]; if (!g) return; g.p = p; if (p >= 1 && !g.on) genOn(G, g); });
      if (x.vo && !G.van.open) vanOpen(G);
      G.noise = x.nz.map(a => ({ x: a[0], y: a[1], t: a[2], r: a[3], k: a[4] }));
      const mine = G.fl.filter(f => G.time - f.t < 0.6 && !x.fl.some(a => Math.abs(a[3] - f.t) < 0.3));
      G.fl = x.fl.map(a => ({ x: a[0], y: a[1], a: a[2], t: a[3] })).concat(mine);
    },
    // buio: il mostro vede piu' lontano; i sopravvissuti vedono vicino, intorno alle lanterne dei compagni e ai generatori accesi
    night(G) {
      const me = G.me, out = !me.alive, lights = [], src = [];
      for (const g of G.gens) if (g.on) { lights.push([g.x + 0.5, g.y + 0.5, 3.2, 0.9]); src.push([g.x + 0.5, g.y + 0.5, 3]); }
      if (G.van.open) { const v = vanC(G); lights.push([v.x, v.y, 4.5, 1]); src.push([v.x, v.y, 4.2]); }
      if (!me.m) for (const c of G.chars) if (c !== me && c.alive && !c.m && Math.hypot(c.x - cq.x, c.y - cq.y) < 14) { lights.push([c.x, c.y, 2, 0.65]); src.push([c.x, c.y, 1.8]); }
      for (const f of G.fl) { const k = (G.time - f.t) / 0.6; if (k >= 0 && k < 1) lights.push([f.x + Math.cos(f.a) * 2.2, f.y + Math.sin(f.a) * 2.2, 3.6, 1 - k]); }
      const R = me.m ? SEE_M : SEE_S;
      return { a: out ? 0.4 : me.m ? 0.6 : 0.95, r: me.m ? 6.5 : 3.8, lights,
        see: (x, y) => out || Math.hypot(x - cq.x, y - cq.y) < R || (!me.m && src.some(([sx, sy, r]) => Math.hypot(x - sx, y - sy) < r)) };
    },
    // il mostro: occhi rossi che brillano (e le stelline quando e' accecato)
    deco(g, c, X, Y, TW, G, L) {
      if (!c.m || !c.alive) return;
      const u = TW / 34, f = c === G.me ? cq.face : c.face, ey = Y - cqTop(L) * TW * 0.72, now = performance.now() / 1000;
      g.fillStyle = 'rgba(255,40,40,' + (0.55 + 0.25 * Math.sin(now * 5)) + ')';
      for (const dx of [2, 8]) { g.beginPath(); g.arc(X + f * dx * u, ey, 2.6 * u, 0, 7); g.fill(); }
      g.fillStyle = '#ffd0d0'; for (const dx of [2, 8]) { g.beginPath(); g.arc(X + f * dx * u, ey, 1 * u, 0, 7); g.fill(); }
      if (c.stun > G.time) { g.font = '13px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let i = 0; i < 3; i++) { const a = now * 4 + i * 2.1; g.fillText('⭐', X + Math.cos(a) * 12 * u, Y - cqTop(L) * TW - 6 + Math.sin(a) * 4 * u); } }
    },
    // sopra alla mappa: lampi delle torce, rumori (solo per il mostro), generatori e furgone (con la freccia se fuori dallo schermo)
    over(g, G, sx, sy, TW) {
      const me = G.me, now = performance.now(), W = cq.w, H = cq.h;
      for (const f of G.fl) {
        const k = (G.time - f.t) / 0.6; if (k < 0 || k >= 1) continue;
        const X = sx(f.x, f.y), Y = sy(f.x, f.y) - TW * 0.5, pts = [-FLASH_A, FLASH_A].map(d => [sx(f.x + Math.cos(f.a + d) * FLASH_R, f.y + Math.sin(f.a + d) * FLASH_R), sy(f.x + Math.cos(f.a + d) * FLASH_R, f.y + Math.sin(f.a + d) * FLASH_R) - TW * 0.5]);
        g.fillStyle = 'rgba(255,250,210,' + (0.55 * (1 - k)) + ')'; g.beginPath(); g.moveTo(X, Y); g.lineTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); g.closePath(); g.fill();
      }
      // il mostro (vivo e sveglio) sente i rumori: cerchi che si allargano; quelli fuori dallo schermo come frecce sul bordo
      if (me.m && me.alive) {
        if (G.phase === 'play' && now > (G.vT || 0)) { G.vT = now + 400; voice(G); }
        const all = G.noise.concat(G.vn.filter(o => G.time - o.t < 2));
        for (const o of all) {
          const age = G.time - o.t; if (age < 0 || age > 1.6 || Math.hypot(o.x - cq.x, o.y - cq.y) > o.r) continue;
          const col = o.k === 'g' ? '255,160,60' : o.k === 'v' ? '120,220,255' : '255,255,255', X = sx(o.x, o.y), Y = sy(o.x, o.y);
          if (X < 0 || X > W || Y < 0 || Y > H) { if (age < 0.8) edge(g, X, Y, W, H, o.k === 'g' ? '⚙️' : o.k === 'v' ? '🗣️' : '👣', 'rgba(' + col + ',.9)'); continue; }
          g.strokeStyle = 'rgba(' + col + ',' + (0.8 * (1 - age / 1.6)) + ')'; g.lineWidth = 2.5;
          for (const k of [0, 0.35]) { const r = (0.3 + Math.max(0, age - k) * 1.4) * TW; if (age > k) { g.beginPath(); g.ellipse(X, Y, r, r * 0.5, 0, 0, 7); g.stroke(); } }
        }
      }
      // generatori: icona e avanzamento; per i sopravvissuti freccia verso il piu' vicino (o verso il furgone quando e' pronto)
      g.font = '15px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      let tgt = null, td = 1e9;
      for (const gn of G.gens) {
        const X = sx(gn.x + 0.5, gn.y + 0.5), Y = sy(gn.x + 0.5, gn.y + 0.5) - TW * 1.25;
        if (!gn.on) { const d = Math.hypot(gn.x + 0.5 - cq.x, gn.y + 0.5 - cq.y); if (d < td) { td = d; tgt = [X, Y, '⚙️']; } }
        if (X < -20 || X > W + 20 || Y < -20 || Y > H + 20) continue;
        if (gn.on) continue;
        g.fillStyle = 'rgba(20,22,28,.8)'; g.beginPath(); g.arc(X, Y, 12, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillText('⚙️', X, Y + 1);
        if (gn.p > 0) { g.fillStyle = 'rgba(0,0,0,.7)'; cqRR(g, X - 20, Y + 15, 40, 7, 3.5); g.fill(); g.fillStyle = '#7be0a0'; cqRR(g, X - 19, Y + 16, Math.max(3, 38 * gn.p), 5, 2.5); g.fill(); }
      }
      if (G.van.open) { const v = vanC(G), X = sx(v.x, v.y), Y = sy(v.x, v.y) - TW * 1.5; tgt = [X, Y, '🚐']; if (X > 0 && X < W && Y > 0 && Y < H) { g.fillStyle = '#e0b84a'; g.beginPath(); g.arc(X, Y + Math.sin(now / 250) * 3, 13, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillText('🚐', X, Y + 1 + Math.sin(now / 250) * 3); } }
      if (!me.m && me.alive && tgt) edge(g, tgt[0], tgt[1], W, H, tgt[2], '#e0b84a');
    }
  };
  // freccia sul bordo dello schermo verso qualcosa che e' fuori (X, Y = dove sarebbe)
  function edge(g, X, Y, W, H, icon, col) {
    const m = 34, top = 120, bot = H - 140; if (X > m && X < W - m && Y > top && Y < bot) return;
    const cx = W / 2, cy = (top + bot) / 2, dx = X - cx, dy = Y - cy, k = Math.min(Math.abs((W / 2 - m) / (dx || 1e-6)), Math.abs(((bot - top) / 2) / (dy || 1e-6)));
    const ex = cx + dx * k, ey = cy + dy * k, a = Math.atan2(dy, dx);
    g.fillStyle = col; g.beginPath(); g.moveTo(ex + Math.cos(a) * 20, ey + Math.sin(a) * 20); g.lineTo(ex + Math.cos(a + 2.4) * 12, ey + Math.sin(a + 2.4) * 12); g.lineTo(ex + Math.cos(a - 2.4) * 12, ey + Math.sin(a - 2.4) * 12); g.fill();
    g.fillStyle = 'rgba(20,22,28,.85)'; g.beginPath(); g.arc(ex, ey, 13, 0, 7); g.fill();
    g.font = '14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(icon, ex, ey + 1);
  }
  // il mostro sente chi parla al microfono: livello della voce che arriva dai telefoni degli altri
  function voice(G) {
    if (typeof cqV === 'undefined') return;
    for (const Pr of Object.values(cqV.peers)) {
      const c = G.chars.find(o => o.sid === Pr.sid && o.alive && !o.m); if (!c || !Pr.pc) continue;
      Pr.pc.getStats().then(st => st.forEach(r => { if (r.type === 'inbound-rtp' && r.kind === 'audio' && r.audioLevel > 0.06) G.vn.push({ x: c.x, y: c.y, t: G.time, r: 14, k: 'v' }); })).catch(() => {});
    }
    G.vn = G.vn.filter(o => G.time - o.t < 2);
  }
})();
