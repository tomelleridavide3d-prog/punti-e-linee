// MODULO GUARDIE DEL COMPUTER (Colpo all'hotel; servira' anche a Evasione e Spie a Venezia).
// Si carica con cqLib('guardie') e si usa da CQ_LIB.guardie. Le guardie NON sono personaggi del motore: stanno in G.gd (le muove l'host,
// gli amici le ricevono con snap/apply) e si disegnano con M.extras.
// Una guardia: { id, x, y, a: dove guarda (angolo nel mondo), st: stato, sus: sospetto 0-1, route: [[x, y, attesa, angolo]], ri: tappa, path }.
// STATI: 'pat' ronda (alle tappe si ferma e si guarda intorno) · 'sus' ha intravisto qualcuno: si gira, il "?" si riempie · 'inv' va a vedere un punto
// (rumore, telecamera, compagno che chiama) e si guarda intorno · 'chase' "!" insegue · 'ko' stordita · 'ret' torna alla ronda.
// CONO DI VISTA: lungo env.range(x, y) = portata verso il punto x, y (in luce piu' lunga, al buio solo la torcia), mezza apertura HALF, fermato da opaque(x, y) (muri, oggetti alti,
// porte chiuse: il gioco puo' cambiare GD.tall); da vicinissimo (NEAR) ti sente anche alle spalle.
// tick(G, dt, env) con env = { thieves: [c], pos(c), vis(c) (quanto si nota: 1 normale), range(x, y), alert (bool), k (difficolta' 0.8-1.25), speed (velocita' dei ladri),
//   onCatch(gd, c), onKo(gd, ko) (una guardia trova un compagno stordito), onChase(gd, c) }
// TELECAMERE: { x, y, a0, sw, per, r, off(G) } girano col tempo (uguali su ogni telefono), see(G, cam, x, y).
(() => {
  const HALF = 0.72, NEAR = 1.15, CATCH = 0.72, LOOSE = 2.6, KO_T = 25, LOOK_T = 3;
  const GD = CQ_LIB.guardie = {
    HALF, NEAR, CATCH, KO_T,
    tall: new Set(['shelf', 'locker', 'fridge', 'rack', 'curtain', 'greenscreen', 'truck', 'van']),
    opaque(x, y) {
      x = Math.floor(x); y = Math.floor(y);
      if (!cqFloor[y] || !cqFloor[y][x]) return true;
      const s = cqSolid[y][x]; return !!s && (!!s.wall || GD.tall.has(s.prop));
    },
    los(ax, ay, bx, by) {
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
      for (let i = 1; i < n; i++) { const t = i / n; if (GD.opaque(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; }
      return true;
    },
    // quanto la guardia vede il punto x, y: 0 = niente, fino a 1 = vicino e in pieno cono
    sees(gd, x, y, R) {
      if (gd.st === 'ko') return 0;
      const dx = x - gd.x, dy = y - gd.y, d = Math.hypot(dx, dy);
      if (d < NEAR) return GD.los(gd.x, gd.y, x, y) ? 1 : 0;
      if (d > R) return 0;
      let a = Math.atan2(dy, dx) - gd.a; a = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(a) > HALF) return 0;
      if (!GD.los(gd.x, gd.y, x, y)) return 0;
      return 0.2 + 0.8 * (1 - d / R);
    },
    // punti del cono (per disegnarlo): raggi che si fermano ai muri
    cone(x, y, a, R, half = HALF, n = 18) {
      const P = [[x, y]];
      for (let i = 0; i <= n; i++) {
        const b = a - half + (2 * half * i) / n, cx = Math.cos(b), cy = Math.sin(b); let r = 0.3;
        while (r < R && !GD.opaque(x + cx * r, y + cy * r)) r += 0.3;
        P.push([x + cx * Math.min(r, R), y + cy * Math.min(r, R)]);
      }
      return P;
    },
    make: defs => defs.map((d, id) => ({ id, x: d.route[0][0], y: d.route[0][1], a: d.route[0][3] || 0, st: 'pat', sus: 0, route: d.route, ri: 0, path: [], wait: 0, ko: 0, tgt: -1, lx: 0, ly: 0, lose: 0, ix: 0, iy: 0, look: 0, walk: 0, post: !!d.post, n: d.n || '' })),
    // va verso x, y (percorso a celle); false se non ci arriva
    // percorsi: un gioco puo' metterne uno suo (Colpo all'hotel: anche da un piano all'altro); chi non lo usa lo rimette a null
    pathFn: null,
    go(gd, x, y) {
      let tx = x, ty = y; if (!cqCellFree(Math.floor(tx), Math.floor(ty))) { const q = cqSpot(Math.floor(tx), Math.floor(ty)); tx = q.x; ty = q.y; }
      gd.path = (GD.pathFn || cqPath)(gd.x, gd.y, tx, ty); return gd.path.length > 0 || Math.hypot(gd.x - tx, gd.y - ty) < 0.6;
    },
    step(gd, dt, sp) {
      const p = gd.path[0]; if (!p) { gd.walk = 0; return true; }
      const dx = p[0] - gd.x, dy = p[1] - gd.y, d = Math.hypot(dx, dy), st = CQ_SPEED * sp * dt;
      if (d > 0.01) { const t = Math.atan2(dy, dx); let da = t - gd.a; da = Math.atan2(Math.sin(da), Math.cos(da)); gd.a += da * Math.min(1, dt * 9); }
      if (d <= st) { gd.x = p[0]; gd.y = p[1]; gd.path.shift(); } else { gd.x += dx / d * st; gd.y += dy / d * st; }
      gd.walk += dt * 10 * sp; return !gd.path.length;
    },
    turn(gd, t, dt, k = 5) { let da = t - gd.a; da = Math.atan2(Math.sin(da), Math.cos(da)); gd.a += da * Math.min(1, dt * k); },
    // un rumore in x, y: le guardie entro r (e non gia' all'inseguimento) vanno a vedere
    noise(G, x, y, r) {
      for (const gd of G.gd) { if (gd.st === 'ko' || gd.st === 'chase') continue; if (Math.hypot(gd.x - x, gd.y - y) > r) continue; GD.investigate(gd, x, y); }
    },
    investigate(gd, x, y) { if (gd.st === 'ko' || gd.st === 'chase') return; gd.st = 'inv'; gd.ix = x; gd.iy = y; gd.look = 0; if (!GD.go(gd, x, y)) gd.path = []; },
    stun(G, gd) { gd.st = 'ko'; gd.ko = G.time + KO_T; gd.path = []; gd.sus = 0; gd.tgt = -1; gd.found = 0; },
    tick(G, dt, env) {
      const T = env.thieves, al = env.alert, k = env.k || 1;
      for (const gd of G.gd) {
        if (gd.st === 'ko') { if (G.time >= gd.ko) { gd.st = 'inv'; gd.ix = gd.x; gd.iy = gd.y; gd.look = 0; gd.path = []; gd.woke = 1; } continue; }
        // chi vedo? il piu' visibile dei ladri
        // la portata dipende dalla luce DOVE STA il ladro (in luce lo vedo da lontano, al buio solo vicino con la torcia)
        const Rk = (al ? 1.22 : 1) * (0.85 + 0.15 * k);
        let best = null, bv = 0;
        for (const c of T) { const p = env.pos(c), v = GD.sees(gd, p.x, p.y, env.range(p.x, p.y) * Rk) * (env.vis ? env.vis(c) : 1); if (v > bv) { bv = v; best = c; } }
        // un compagno a terra nel mio cono: corro a svegliarlo e scatta l'allerta
        if (gd.st !== 'chase') for (const o of G.gd) if (o !== gd && o.st === 'ko' && !o.found && GD.sees(gd, o.x, o.y, env.range(o.x, o.y) * Rk) > 0) { o.found = 1; o.ko = Math.min(o.ko, G.time + 2.5); GD.investigate(gd, o.x, o.y); if (env.onKo) env.onKo(gd, o); }
        if (best) {
          const p = env.pos(best); gd.lx = p.x; gd.ly = p.y;
          if (gd.st === 'chase') { gd.tgt = best.id; gd.lose = 0; }
          else {
            gd.sus = Math.min(1, gd.sus + dt * bv * (al ? 1.6 : 1.0) * k);
            if (gd.st !== 'sus') { gd.st0 = gd.st; gd.sT = G.time; gd.st = 'sus'; gd.path = []; }
            if (gd.sus >= 1) { gd.st = 'chase'; gd.tgt = best.id; gd.lose = 0; gd.path = []; if (env.onChase) env.onChase(gd, best); }
          }
        } else if (gd.st === 'sus') { gd.sus -= dt * 0.3; if (gd.sus <= 0) { gd.sus = 0; GD.investigate(gd, gd.lx, gd.ly); } }
        else if (gd.st !== 'chase') gd.sus = Math.max(0, gd.sus - dt * 0.25);
        // movimento secondo lo stato
        if (gd.st === 'sus') {
          GD.turn(gd, Math.atan2(gd.ly - gd.y, gd.lx - gd.x), dt, 6);
          if (gd.sus > 0.45) { if (!gd.path.length || (gd.rp = (gd.rp || 0) - dt) <= 0) { gd.rp = 0.5; GD.go(gd, gd.lx, gd.ly); } GD.step(gd, dt, 0.38); } else gd.walk = 0;
        } else if (gd.st === 'chase') {
          const c = T.find(o => o.id === gd.tgt);
          if (!c) { GD.investigate(gd, gd.lx, gd.ly); continue; }
          const p = env.pos(c), d = Math.hypot(p.x - gd.x, p.y - gd.y);
          if (best !== c) { gd.lose += dt; if (gd.lose > LOOSE) { gd.sus = 0.5; GD.investigate(gd, gd.lx, gd.ly); continue; } }
          if (d < CATCH) { gd.st = 'ret'; gd.sus = 0; gd.tgt = -1; gd.path = []; env.onCatch(gd, c); continue; }
          if ((gd.rp = (gd.rp || 0) - dt) <= 0 || !gd.path.length) { gd.rp = 0.25; const tx = best === c ? p.x : gd.lx, ty = best === c ? p.y : gd.ly; if (!GD.go(gd, tx, ty) || d < 1.3) gd.path = [[tx, ty]]; }
          GD.step(gd, dt, (al ? 0.95 : 0.86) * (0.92 + 0.08 * k) * (env.speed || 1));
        } else if (gd.st === 'inv') {
          if (gd.path.length) GD.step(gd, dt, al ? 0.75 : 0.6);
          else { gd.look += dt; gd.walk = 0; gd.a += dt * 1.6 * Math.sin(gd.look * 1.3 + 1); if (gd.look > LOOK_T) { gd.st = 'ret'; gd.path = []; } }
        } else if (gd.st === 'ret') {
          const w = gd.route[gd.ri]; if (!gd.path.length && !GD.go(gd, w[0], w[1])) { gd.x = w[0]; gd.y = w[1]; }
          if (GD.step(gd, dt, 0.5)) { gd.st = 'pat'; gd.wait = w[2] || 0; }
        } else {   // ronda
          if (gd.wait > 0) { gd.wait -= dt; gd.walk = 0; const w = gd.route[gd.ri]; const base = w[3] != null ? w[3] : gd.a; GD.turn(gd, base + Math.sin(G.time * 0.9 + gd.id) * 0.9, dt, 2.5); continue; }
          if (!gd.path.length) { gd.ri = (gd.ri + 1) % gd.route.length; const w = gd.route[gd.ri]; if (!GD.go(gd, w[0], w[1])) { gd.ri = (gd.ri + 1) % gd.route.length; continue; } gd.arr = 1; }
          if (GD.step(gd, dt, (al ? 0.62 : 0.5) * (0.92 + 0.08 * k)) && gd.arr) { gd.arr = 0; gd.wait = gd.route[gd.ri][2] || 0.5; }
        }
      }
    },
    // radio: chi insegue chiama le guardie vicine
    radio(G, gd, r = 11) { for (const o of G.gd) if (o !== gd && o.st !== 'ko' && o.st !== 'chase' && Math.hypot(o.x - gd.x, o.y - gd.y) < r) GD.investigate(o, gd.lx, gd.ly); },
    // telecamera: angolo adesso (gira avanti e indietro col tempo: uguale su tutti i telefoni)
    camA: (G, c) => c.a0 + c.sw * Math.sin(G.time * 2 * Math.PI / c.per + c.ph),
    camSees(G, c, x, y) {
      const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy); if (d > c.r || d < 0.4) return false;
      let a = Math.atan2(dy, dx) - GD.camA(G, c); a = Math.atan2(Math.sin(a), Math.cos(a));
      return Math.abs(a) < c.h && GD.los(c.x, c.y, x, y);
    },
    // online: [x, y, angolo, stato, sospetto, secondi di ko, chi insegue, punto visto]
    ST: ['pat', 'sus', 'inv', 'chase', 'ko', 'ret'],
    snap: G => G.gd.map(g => [Math.round(g.x * 100) / 100, Math.round(g.y * 100) / 100, Math.round(g.a * 100) / 100, GD.ST.indexOf(g.st), Math.round(g.sus * 100) / 100, g.st === 'ko' ? Math.round((g.ko - G.time) * 10) / 10 : 0, g.tgt, g.w ? 1 : 0]),
    apply(G, a) {
      a.forEach((v, i) => {
        const g = G.gd[i]; if (!g) return;
        g.tx = v[0]; g.ty = v[1]; if (Math.hypot(g.tx - g.x, g.ty - g.y) > 3) { g.x = g.tx; g.y = g.ty; }
        g.ta = v[2]; g.st = GD.ST[v[3]] || 'pat'; g.sus = v[4]; g.ko = G.time + v[5]; g.tgt = v[6]; g.w = v[7];
      });
    },
    // amici: le guardie scivolano verso l'ultima posizione ricevuta
    smooth(G, dt) {
      for (const g of G.gd) {
        if (g.tx == null) continue; const dx = g.tx - g.x, dy = g.ty - g.y, d = Math.hypot(dx, dy), k = Math.min(1, dt * 10);
        g.x += dx * k; g.y += dy * k; if (d > 0.02) g.walk += dt * 10; else g.walk = 0;
        let da = g.ta - g.a; da = Math.atan2(Math.sin(da), Math.cos(da)); g.a += da * k;
      }
    },
    // GUARDIA disegnata: divisa blu scuro, berretto con la visiera e lo stemma, cinturone, torcia in mano (verso dove guarda)
    draw(g, X, Y, TW, walk, f, ko) {
      const u = TW / 34, bob = ko ? 0 : Math.abs(Math.sin(walk)) * 2 * u, sw = ko ? 0 : Math.sin(walk) * 4;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y, (ko ? 22 : 13) * u, 5.5 * u, 0, 0, 7); g.fill();
      g.save(); g.translate(X, Y - bob); if (ko) { g.translate(-f * 18 * u, -4 * u); g.rotate(f * Math.PI / 2); } g.scale(u, u);
      const ell = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
      const ln = (x0, y0, x1, y1, c, w) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
      const UNI = '#24324e', UNI2 = '#1a2540';
      for (const [x0, s] of [[-4, 1], [4, -1]]) { const o = s * sw; ln(x0, -16, x0 + o * 0.6, -3, '#1a2238', 5); ell(x0 + o * 0.6 + f * 1.5, -2, 4, 2.2, '#0c0c10'); }
      g.fillStyle = UNI; g.beginPath(); g.moveTo(-9, -42); g.lineTo(9, -42); g.lineTo(10, -16); g.lineTo(-10, -16); g.closePath(); g.fill();
      g.fillStyle = '#121214'; g.fillRect(-10, -20, 20, 3.2); ell(f * 6, -18.5, 2, 2, '#8a8a92');
      g.fillStyle = '#d8b84a'; g.beginPath(); g.moveTo(-f * 4.5, -37); g.lineTo(-f * 2.5, -34); g.lineTo(-f * 4.5, -31); g.lineTo(-f * 6.5, -34); g.closePath(); g.fill();   // distintivo
      ln(-f * 9, -40, -f * 10 + sw * 0.3, -24, UNI2, 5.5); ell(-f * 10 + sw * 0.3, -22.5, 2.6, 2.6, '#e2c2a0');
      ln(f * 9, -40, f * 13, -28, UNI, 5.5); ell(f * 13, -27, 2.6, 2.6, '#e2c2a0');
      g.fillStyle = '#2a2a2e'; g.save(); g.translate(f * 14, -27); g.rotate(f * -0.3); g.fillRect(-1, -2, f * 9, 4); g.restore(); ell(f * 22.5, -29.5, 2.2, 2.6, ko ? '#555' : '#fff4c0');   // torcia
      ell(f * 0.8, -48, 6, 6.5, '#e2c2a0');
      ell(f * 0.8 + f * 2.6, -48.5, 1.1, 1.1, '#111'); ell(f * 0.8 - f * 1.2, -48.5, 1.1, 1.1, '#111');
      g.strokeStyle = '#6a3a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(f * 0.8 - 2, -44.5); g.lineTo(f * 0.8 + 2.4, -44.8); g.stroke();
      // berretto con la visiera
      g.fillStyle = UNI2; g.beginPath(); g.moveTo(-7 + f * 0.8, -52); g.quadraticCurveTo(f * 0.8, -60, 7 + f * 0.8, -52); g.closePath(); g.fill();
      g.fillStyle = '#0e1220'; g.beginPath(); g.ellipse(f * 0.8 + f * 5, -51.6, 5.5, 1.6, 0, 0, 7); g.fill();
      ell(f * 0.8, -55.5, 1.6, 1.6, '#d8b84a');
      g.restore();
      if (ko) { const t = performance.now() / 300; g.font = Math.round(TW * 0.34) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💫', X - f * TW * 0.5 + Math.cos(t) * TW * 0.25, Y - TW * 0.9 + Math.sin(t) * 3); }
    },
    // sopra la testa: "?" che si riempie (sospetto) o "!" rosso (inseguimento); "…" quando va a controllare un rumore
    mark(g, gd, X, Y, TW, top = 2.15) {
      if (gd.st === 'ko') return;
      const y = Y - TW * top, t = performance.now() / 1000;
      if (gd.st === 'chase') {
        g.fillStyle = '#e8302a'; g.beginPath(); g.arc(X, y, 12, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
        g.fillStyle = '#fff'; g.font = '900 17px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', X, y + 1); return;
      }
      if (gd.sus > 0.02 || gd.st === 'sus') {
        const k = Math.min(1, gd.sus); g.fillStyle = 'rgba(20,20,26,.8)'; g.beginPath(); g.arc(X, y, 12, 0, 7); g.fill();
        g.fillStyle = k > 0.6 ? '#f08a24' : '#f2c230'; g.beginPath(); g.moveTo(X, y); g.arc(X, y, 12, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.font = '900 15px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', X, y + 1); return;
      }
      if (gd.st === 'inv') { g.fillStyle = 'rgba(20,20,26,.7)'; g.beginPath(); g.arc(X, y, 10, 0, 7); g.fill(); g.fillStyle = '#c8d0e0'; for (let i = 0; i < 3; i++) { g.globalAlpha = 0.4 + 0.6 * (((t * 2 - i * 0.3) % 1 + 1) % 1); g.beginPath(); g.arc(X - 5 + i * 5, y, 1.8, 0, 7); g.fill(); } g.globalAlpha = 1; }
    }
  };
})();
