// MODULO GUARDIE DEL COMPUTER (Colpo all'hotel; servira' anche a Evasione, Spie a Venezia e agli altri giochi con guardie).
// Si carica con cqLib('guardie') e si usa da CQ_LIB.guardie. Le guardie NON sono personaggi del motore: stanno in G.gd (le muove l'host,
// gli amici le ricevono con snap/apply) e si disegnano con M.extras.
// Una guardia: { id, x, y, a: dove guarda (angolo nel mondo), st: stato, sus: sospetto 0-1, route: [[x, y, attesa, angolo]], ri: tappa, path, nm: nome }.
// STATI: 'pat' ronda (alle tappe si ferma e si guarda intorno) · 'sus' ha intravisto qualcuno: si gira, il "?" si riempie · 'inv' va a vedere un punto
// (rumore, telecamera, compagno che chiama) e si guarda intorno · 'chase' "!" insegue · 'ko' stordita · 'ret' torna alla ronda ·
// 'srch' CERCA: ricorda dove ti ha visto e controlla i punti intorno, anche i NASCONDIGLI (apre l'armadio: se ci sei ti scova) · 'post' presidia un passaggio.
// CERVELLO (18-10-2026): MEMORIA E RICERCA (dopo averti perso o intravisto cerca dove potresti essere andato: in avanti nella direzione in cui
// scappavi e nei nascondigli vicini; i punti sono divisi tra le guardie che cercano, G.gcl), SQUADRA (allarme: chi e' vicino taglia la strada
// presidiando le scale o le uscite piu' vicine, altri cercano intorno; chiamata radio ai colleghi che non rispondono), COSE FUORI POSTO
// (G.gan: il gioco segnala porte aperte, cassetti frugati...; una guardia che le vede va a controllare e poi cerca; la squadra diventa nervosa),
// UMORE (gd.md 0-1: piu' alto = sospetto piu' rapido), FUMETTI con frasi buffe (gd.bub, mandati agli amici).
// CONO DI VISTA: lungo env.range(x, y) = portata verso il punto x, y (in luce piu' lunga, al buio solo la torcia), mezza apertura HALF, fermato da opaque(x, y) (muri, oggetti alti,
// porte chiuse: il gioco puo' cambiare GD.tall); da vicinissimo (NEAR) ti sente anche alle spalle.
// tick(G, dt, env) con env = { thieves: [c], pos(c), vis(c) (quanto si nota: 1 normale), range(x, y), alert (bool), k (difficolta' 0.8-1.25), speed (velocita' dei ladri),
//   onCatch(gd, c), onKo(gd, ko) (una guardia trova un compagno stordito), onChase(gd, c),
//   hides: [{x, y, n}] nascondigli, hiddenAt(i) -> ladro nascosto li' o null, onFlush(gd, c) (scovato), same(x1, y1, x2, y2) (stesso piano/zona),
//   chokes(x, y) -> passaggi da presidiare vicino a x, y [[x, y], ...], onNotice(gd, an) (una cosa fuori posto notata) }
// TELECAMERE: { x, y, a0, sw, per, r, off(G) } girano col tempo (uguali su ogni telefono), see(G, cam, x, y).
(() => {
  const HALF = 0.72, NEAR = 1.15, CATCH = 0.72, LOOSE = 2.6, KO_T = 25, LOOK_T = 3;
  const SRCH_R = 8, SRCH_T = 26, CHK_T = 1.6, POST_T = 28, RADIO_T = 22, NOTICE_R = 5.5, NERV_T = 60;
  const NAMES = ['Marco', 'Gino', 'Tonino', 'Sergio', 'Pino', 'Franco', 'Luigi', 'Bruno', 'Nando', 'Ugo'];
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  // FRASI DEI FUMETTI (buffe). %n = nome di un collega
  const PH = {
    idle: ['Che noia stanotte…', 'Chissà se in cucina è rimasto del tiramisù', 'Altre tre ore di turno…', 'Stasera la partita la guardo di nascosto', 'Mi fanno male i piedi', 'Ma chi ha messo tutto questo marmo?', 'Il direttore non mi saluta mai', '*sbadiglio*', 'Questo hotel di notte mette i brividi', 'Chi ha fame alza la mano… nessuno.'],
    sus: ['Eh? Chi va là?', 'Mi è sembrato di vedere qualcosa…', 'C\'è qualcuno?', 'Ho visto un\'ombra…', 'Mmh…'],
    lost: ['Dove si è cacciato?', 'Era qui un secondo fa!', 'Scappato… ma non lontano', 'Ora ti cerco, eh!', 'Non può essere sparito nel nulla'],
    search: ['Vieni fuori, so che sei qui', 'Controllo un po\' in giro…', 'Dove ti sei nascosto?', 'Esci fuori, non ti faccio niente… forse', 'Qui ci deve essere qualcuno'],
    chk: ['Vediamo un po\' qua dentro…', 'E se fosse qui dietro?', 'Toc toc…', 'Apro e guardo, eh!'],
    empty: ['Niente. Solo polvere.', 'Vuoto. Meno male.', 'Qui non c\'è nessuno', 'Solo una calza spaiata'],
    found: ['AH-AH! Beccato!', 'Ti ho trovato!', 'Credevi di fregarmi, eh?', 'Fuori di lì!'],
    chase: ['FERMO!', 'Alt! Fermati!', 'Non scappi!', 'Ti prendo!', 'Allarme! Allarme!'],
    post: ['Da qui non passa nessuno', 'Sorveglio io le scale', 'Bloccato il passaggio, capo!', 'Provateci a passare…'],
    giveup: ['Sarà stato il gatto del direttore', 'Me lo sarò sognato', 'Boh, torno al mio giro', 'Sono troppo vecchio per queste cose', 'Lo dico al capo domani. Forse.'],
    coin: ['Una monetina? Oggi è il mio giorno fortunato!', 'Chi butta soldi per terra?', 'Questa me la tengo'],
    radio: ['%n? %n, rispondi!', '%n, dove sei finito?', 'Radio a %n… niente. Brutto segno.'],
    ko: ['%n! Svegliati! Chi è stato?!', 'Hanno steso %n! ALLARME!'],
    nerv: ['Qui c\'è qualcosa che non va…', 'Stanotte siamo tutti nervosi'],
    an: { src: ['Chi ha lasciato aperto questo cassetto?', 'Qualcuno ha frugato qui!', 'Tutto sottosopra… sospetto'], door: ['Questa porta doveva essere chiusa!', 'Chi ha aperto qui?!'], vault: ['IL CAVEAU È APERTO!', 'Il caveau! Allarme!'], dark: ['Chi ha spento le luci?!', 'Sarà saltata la corrente… o no?'], cam: ['La telecamera ha visto qualcosa…', 'Vado a vedere cosa ha ripreso'] }
  };
  const GD = CQ_LIB.guardie = {
    HALF, NEAR, CATCH, KO_T, PH,
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
    make: defs => { const nm = NAMES.slice().sort(() => Math.random() - 0.5); return defs.map((d, id) => ({ id, x: d.route[0][0], y: d.route[0][1], a: d.route[0][3] || 0, st: 'pat', sus: 0, route: d.route, ri: 0, path: [], wait: 0, ko: 0, tgt: -1, lx: 0, ly: 0, lvx: 0, lvy: 0, lose: 0, ix: 0, iy: 0, look: 0, walk: 0, post: !!d.post, n: d.n || '', nm: nm[id % nm.length], md: 0, sp: [], bub: null, bubT: 0, idleT: 8 + Math.random() * 20 })); },
    // percorsi: un gioco puo' metterne uno suo (Colpo all'hotel: anche da un piano all'altro); chi non lo usa lo rimette a null
    pathFn: null,
    // va verso x, y (percorso a celle); false se non ci arriva
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
    // FUMETTO: una frase buffa sopra la testa (k = tipo, an = cosa fuori posto); al massimo una ogni 3 s per guardia (tranne quelle importanti)
    say(G, gd, k, an, other) {
      const imp = k === 'chase' || k === 'found' || k === 'ko' || k === 'an';
      if (!imp && G.time < gd.bubT) return;
      const pool = k === 'an' ? PH.an[an] || PH.an.src : PH[k]; if (!pool) return;
      gd.bub = { t: rnd(pool).replace(/%n/g, other || 'Marco'), e: G.time + (imp ? 2.6 : 3.2) }; gd.bubT = G.time + 3;
    },
    // un rumore in x, y: le guardie entro r (e non gia' all'inseguimento) vanno a vedere
    noise(G, x, y, r, why) {
      for (const gd of G.gd) { if (gd.st === 'ko' || gd.st === 'chase') continue; if (Math.hypot(gd.x - x, gd.y - y) > r) continue; GD.investigate(gd, x, y, why || 'noise'); }
    },
    // va a vedere un punto; why: 'noise' (rumore: dopo guarda e basta, a volte cerca), 'see' / 'cam' / 'an' / 'lost' (poi CERCA intorno)
    investigate(gd, x, y, why) { if (gd.st === 'ko' || gd.st === 'chase') return; gd.st = 'inv'; gd.why = why || 'noise'; gd.ix = x; gd.iy = y; gd.look = 0; if (!GD.go(gd, x, y)) gd.path = []; },
    stun(G, gd) { gd.st = 'ko'; gd.ko = G.time + KO_T; gd.path = []; gd.sus = 0; gd.tgt = -1; gd.found = 0; gd.koT = G.time; gd.sp = []; },
    // RICERCA: punti da controllare intorno a x, y (in avanti verso vx, vy, dove scappava) e nascondigli vicini; quelli presi da un collega si saltano
    search(G, gd, x, y, vx, vy, env, n) {
      const cl = G.gcl || (G.gcl = {}), key = p => Math.round(p[0]) + ',' + Math.round(p[1]), fx = x + (vx || 0) * 4, fy = y + (vy || 0) * 4, pts = [];
      const same = (a, b) => !env.same || env.same(x, y, a, b);
      if (env.hides) env.hides.forEach((h, i) => { const d = Math.hypot(h.x + 0.5 - x, h.y + 0.5 - y); if (d < SRCH_R && same(h.x, h.y)) pts.push({ x: h.x + 0.5, y: h.y + 0.5, h: i, s: Math.hypot(h.x + 0.5 - fx, h.y + 0.5 - fy) * 0.8 + Math.random() * 3 }); });
      for (let i = 0; i < 8; i++) { const a = Math.random() * 7, r = 2 + Math.random() * 5, px = x + Math.cos(a) * r + (vx || 0) * 2, py = y + Math.sin(a) * r + (vy || 0) * 2; if (cqCellFree(Math.floor(px), Math.floor(py)) && same(px, py)) pts.push({ x: Math.floor(px) + 0.5, y: Math.floor(py) + 0.5, h: -1, s: Math.hypot(px - fx, py - fy) + Math.random() * 3 }); }
      if (cqCellFree(Math.floor(fx), Math.floor(fy)) && same(fx, fy)) pts.push({ x: Math.floor(fx) + 0.5, y: Math.floor(fy) + 0.5, h: -1, s: -5 });
      const out = []; pts.sort((a, b) => a.s - b.s);
      for (const p of pts) { if (out.length >= (n || 5)) break; const k = key([p.x, p.y]); if (cl[k] && cl[k].g !== gd.id && cl[k].t > G.time) continue; cl[k] = { g: gd.id, t: G.time + 20 }; out.push(p); }
      gd.st = 'srch'; gd.sp = out; gd.sEnd = G.time + SRCH_T * (env.alert ? 1.4 : 1); gd.path = []; gd.chk = 0; gd.look = 0;
      if (!out.length) { gd.st = 'ret'; gd.path = []; }
    },
    // ALLARME DI SQUADRA: chi insegue chiama; il collega piu' vicino presidia il passaggio verso cui scappa il ladro, altri due cercano intorno
    alarm(G, gd, env) {
      const free = G.gd.filter(o => o !== gd && o.st !== 'ko' && o.st !== 'chase' && o.st !== 'post' && !o.post).map(o => ({ o, d: Math.hypot(o.x - gd.lx, o.y - gd.ly) })).filter(q => q.d < 24 && (!env.same || env.same(q.o.x, q.o.y, gd.lx, gd.ly))).sort((a, b) => a.d - b.d);
      let i = 0;
      const ch = env.chokes ? env.chokes(gd.lx, gd.ly) : [];
      if (ch.length && free[i]) { const p = ch[0]; GD.postAt(G, free[i].o, p[0], p[1], gd.lx, gd.ly); GD.say(G, free[i].o, 'post'); i++; }
      for (let k = 0; k < 2 && free[i]; k++, i++) GD.investigate(free[i].o, gd.lx + (Math.random() - 0.5) * 3, gd.ly + (Math.random() - 0.5) * 3, 'see');
      G.gnv = Math.max(G.gnv || 0, G.time + NERV_T);
    },
    // presidia un punto per un po' (guardando verso lx, ly)
    postAt(G, gd, x, y, lx, ly, t) { gd.st = 'post'; gd.px = x; gd.py = y; gd.pl = [lx, ly]; gd.pe = G.time + (t || POST_T); if (!GD.go(gd, x, y)) gd.path = []; },
    // il gioco segnala una COSA FUORI POSTO (porta aperta, cassetto frugato, luci spente...): la prima guardia che la vede va a controllare
    anomaly(G, x, y, k) { (G.gan = G.gan || []).push({ x, y, k, t: G.time, n: 0 }); if (G.gan.length > 30) G.gan.shift(); },
    tick(G, dt, env) {
      const T = env.thieves, al = env.alert, k = env.k || 1, nerv = G.time < (G.gnv || 0);
      // CHIAMATA RADIO: ogni tanto la squadra chiama; chi e' stordito da un po' non risponde e il collega piu' vicino va a vedere
      if ((G.grT = (G.grT || G.time + RADIO_T) ) <= G.time) {
        G.grT = G.time + RADIO_T;
        for (const o of G.gd) if (o.st === 'ko' && !o.found && G.time - (o.koT || 0) > 8 && !o.rad) {
          o.rad = 1; let b = null, bd = 1e9; for (const g of G.gd) { if (g.st === 'ko' || g.st === 'chase' || g.post) continue; const d = Math.hypot(g.x - o.x, g.y - o.y) + (env.same && !env.same(g.x, g.y, o.x, o.y) ? 30 : 0); if (d < bd) { bd = d; b = g; } }
          if (b) { GD.say(G, b, 'radio', null, o.nm); GD.investigate(b, o.x, o.y, 'radio'); } break;
        }
      }
      for (const gd of G.gd) {
        if (gd.bub && G.time > gd.bub.e) gd.bub = null;
        if (gd.st === 'ko') { if (G.time >= gd.ko) { gd.st = 'inv'; gd.why = 'see'; gd.ix = gd.x; gd.iy = gd.y; gd.look = 0; gd.path = []; gd.woke = 1; gd.rad = 0; gd.md = 1; } continue; }
        gd.md = Math.max(0, gd.md - dt / 90);
        // chi vedo? il piu' visibile dei ladri
        // la portata dipende dalla luce DOVE STA il ladro (in luce lo vedo da lontano, al buio solo vicino con la torcia)
        const Rk = (al ? 1.22 : 1) * (0.85 + 0.15 * k);
        let best = null, bv = 0;
        for (const c of T) { const p = env.pos(c), v = GD.sees(gd, p.x, p.y, env.range(p.x, p.y) * Rk) * (env.vis ? env.vis(c) : 1); if (v > bv) { bv = v; best = c; } }
        // un compagno a terra nel mio cono: corro a svegliarlo e scatta l'allerta
        if (gd.st !== 'chase') for (const o of G.gd) if (o !== gd && o.st === 'ko' && !o.found && GD.sees(gd, o.x, o.y, env.range(o.x, o.y) * Rk) > 0) { o.found = 1; o.ko = Math.min(o.ko, G.time + 2.5); GD.investigate(gd, o.x, o.y, 'see'); GD.say(G, gd, 'ko', null, o.nm); gd.md = 1; if (env.onKo) env.onKo(gd, o); }
        // COSE FUORI POSTO: la prima che vedo (e che nessuno ha ancora notato) la vado a controllare, poi cerco li' intorno
        if (G.gan && !best && (gd.st === 'pat' || gd.st === 'ret' || gd.st === 'post' || gd.st === 'srch')) for (const an of G.gan) {
          if (an.n || G.time - an.t < 0.5 || Math.hypot(an.x - gd.x, an.y - gd.y) > NOTICE_R + 2 || GD.sees(gd, an.x, an.y, NOTICE_R) <= 0) continue;
          an.n = 1; GD.say(G, gd, 'an', an.k); GD.investigate(gd, an.x, an.y, 'an'); gd.md = Math.min(1, gd.md + 0.5); G.gnv = Math.max(G.gnv || 0, G.time + NERV_T); if (env.onNotice) env.onNotice(gd, an); break;
        }
        if (best) {
          const p = env.pos(best);
          if (gd.lx || gd.ly) { gd.lvx = gd.lvx * 0.7 + (p.x - gd.lx) * 0.3 / Math.max(dt, 0.02); gd.lvy = gd.lvy * 0.7 + (p.y - gd.ly) * 0.3 / Math.max(dt, 0.02); const m = Math.hypot(gd.lvx, gd.lvy); if (m > 1) { gd.lvx /= m; gd.lvy /= m; } }
          gd.lx = p.x; gd.ly = p.y;
          if (gd.st === 'chase') { gd.tgt = best.id; gd.lose = 0; }
          else {
            // umore e nervosismo della squadra: il "?" si riempie piu' in fretta
            gd.sus = Math.min(1, gd.sus + dt * bv * (al ? 1.6 : 1.0) * k * (1 + 0.35 * gd.md) * (nerv ? 1.15 : 1));
            if (gd.st !== 'sus') { gd.st0 = gd.st; gd.sT = G.time; gd.st = 'sus'; gd.path = []; GD.say(G, gd, 'sus'); }
            if (gd.sus >= 1) { gd.st = 'chase'; gd.tgt = best.id; gd.lose = 0; gd.path = []; gd.md = 1; GD.say(G, gd, 'chase'); if (env.onChase) env.onChase(gd, best); }
          }
        } else if (gd.st === 'sus') { gd.sus -= dt * 0.3; if (gd.sus <= 0) { gd.sus = 0; GD.investigate(gd, gd.lx, gd.ly, 'see'); } }
        else if (gd.st !== 'chase') gd.sus = Math.max(0, gd.sus - dt * 0.25);
        // movimento secondo lo stato
        if (gd.st === 'sus') {
          GD.turn(gd, Math.atan2(gd.ly - gd.y, gd.lx - gd.x), dt, 6);
          if (gd.sus > 0.45) { if (!gd.path.length || (gd.rp = (gd.rp || 0) - dt) <= 0) { gd.rp = 0.5; GD.go(gd, gd.lx, gd.ly); } GD.step(gd, dt, 0.38); } else gd.walk = 0;
        } else if (gd.st === 'chase') {
          const c = T.find(o => o.id === gd.tgt);
          // perso (scappato o nascosto): RICORDA dove andava e cerca li', in avanti e nei nascondigli vicini
          if (!c) { GD.say(G, gd, 'lost'); GD.search(G, gd, gd.lx, gd.ly, gd.lvx, gd.lvy, env, al ? 7 : 6); continue; }
          const p = env.pos(c), d = Math.hypot(p.x - gd.x, p.y - gd.y);
          if (best !== c) { gd.lose += dt; if (gd.lose > LOOSE) { gd.sus = 0.5; GD.say(G, gd, 'lost'); GD.search(G, gd, gd.lx, gd.ly, gd.lvx, gd.lvy, env, al ? 7 : 6); continue; } }
          if (d < CATCH) { gd.st = 'ret'; gd.sus = 0; gd.tgt = -1; gd.path = []; env.onCatch(gd, c); continue; }
          if ((gd.rp = (gd.rp || 0) - dt) <= 0 || !gd.path.length) { gd.rp = 0.25; const tx = best === c ? p.x : gd.lx, ty = best === c ? p.y : gd.ly; if (!GD.go(gd, tx, ty) || d < 1.3) gd.path = [[tx, ty]]; }
          GD.step(gd, dt, (al ? 0.95 : 0.86) * (0.92 + 0.08 * k) * (env.speed || 1));
        } else if (gd.st === 'inv') {
          if (gd.path.length) GD.step(gd, dt, al ? 0.75 : 0.6);
          else {
            gd.look += dt; gd.walk = 0; gd.a += dt * 1.6 * Math.sin(gd.look * 1.3 + 1);
            if (gd.look > LOOK_T) {
              // dopo aver controllato: se c'era un motivo vero CERCA intorno, se era solo un rumore a volte (piu' spesso se e' nervosa)
              if (gd.why === 'coin') { GD.say(G, gd, 'coin'); gd.st = 'ret'; gd.path = []; continue; }
              const w = gd.why, deep = w === 'see' || w === 'cam' || w === 'an' || w === 'lost' || w === 'radio';
              if (deep || Math.random() < 0.25 + 0.4 * gd.md) { GD.say(G, gd, 'search'); GD.search(G, gd, gd.ix, gd.iy, 0, 0, env, deep ? (al ? 6 : 4) : 2); }
              else { GD.say(G, gd, 'giveup'); gd.st = 'ret'; gd.path = []; }
            }
          }
        } else if (gd.st === 'srch') {
          // un punto alla volta; ai NASCONDIGLI si ferma e apre/guarda dietro (CHK_T): se c'e' un ladro lo scova
          const p = gd.sp[0];
          if (!p || G.time > gd.sEnd) { GD.say(G, gd, 'giveup'); gd.st = 'ret'; gd.path = []; gd.sp = []; continue; }
          if (gd.chk) {
            gd.walk = 0; GD.turn(gd, Math.atan2(p.y - gd.y, p.x - gd.x), dt, 6);
            if (G.time - gd.chk > CHK_T) {
              gd.chk = 0; gd.sp.shift(); const c = env.hiddenAt ? env.hiddenAt(p.h) : null;
              if (c) { gd.st = 'chase'; gd.tgt = c.id; gd.lose = 0; gd.path = []; gd.sus = 1; gd.md = 1; const q = env.pos(c); gd.lx = q.x; gd.ly = q.y; GD.say(G, gd, 'found'); if (env.onFlush) env.onFlush(gd, c); if (env.onChase) env.onChase(gd, c); }
              else if (Math.random() < 0.5) GD.say(G, gd, 'empty');
            }
            continue;
          }
          if (!gd.path.length && !gd.lk) {
            const near = Math.hypot(p.x - gd.x, p.y - gd.y) < (p.h >= 0 ? 1.5 : 0.7);
            if (near) { if (p.h >= 0) { gd.chk = G.time; GD.say(G, gd, 'chk'); } else gd.lk = G.time; }
            else if (!GD.go(gd, p.x, p.y)) gd.sp.shift();
          }
          if (gd.lk) { gd.walk = 0; gd.a += dt * 2.2 * Math.sin((G.time - gd.lk) * 2); if (G.time - gd.lk > 1.2) { gd.lk = 0; gd.sp.shift(); } continue; }
          if (gd.path.length) { const ar = GD.step(gd, dt, al ? 0.7 : 0.58); if (ar) gd.path = []; }
        } else if (gd.st === 'post') {
          // presidio: va al passaggio e lo sorveglia guardandosi intorno
          if (gd.path.length) GD.step(gd, dt, al ? 0.95 : 0.85);
          else { gd.walk = 0; GD.turn(gd, Math.atan2(gd.pl[1] - gd.y, gd.pl[0] - gd.x) + Math.sin(G.time * 0.8 + gd.id) * 1.1, dt, 2.5); }
          if (G.time > gd.pe) { gd.st = 'ret'; gd.path = []; }
        } else if (gd.st === 'ret') {
          const w = gd.route[gd.ri]; if (!gd.path.length && !GD.go(gd, w[0], w[1])) { gd.x = w[0]; gd.y = w[1]; }
          if (GD.step(gd, dt, 0.5)) { gd.st = 'pat'; gd.wait = w[2] || 0; }
        } else {   // ronda
          if ((gd.idleT -= dt) <= 0) { gd.idleT = 18 + Math.random() * 30; if (Math.random() < 0.6) GD.say(G, gd, nerv ? 'nerv' : 'idle'); }
          if (gd.wait > 0) { gd.wait -= dt; gd.walk = 0; const w = gd.route[gd.ri]; const base = w[3] != null ? w[3] : gd.a; GD.turn(gd, base + Math.sin(G.time * 0.9 + gd.id) * 0.9, dt, 2.5); continue; }
          if (!gd.path.length) {
            // CONTROLLO DI ROUTINE: ogni tanto apre un nascondiglio vicino alla tappa (piu' spesso se la squadra e' nervosa)
            if (env.hides && gd.arr0 && Math.random() < (nerv ? 0.35 : 0.12) * k) { gd.arr0 = 0; const near = env.hides.map((h, i) => ({ h, i, d: Math.hypot(h.x + 0.5 - gd.x, h.y + 0.5 - gd.y) })).filter(q => q.d < 5 && (!env.same || env.same(gd.x, gd.y, q.h.x, q.h.y))).sort((a, b) => a.d - b.d)[0];
              if (near) { gd.st = 'srch'; gd.sp = [{ x: near.h.x + 0.5, y: near.h.y + 0.5, h: near.i }]; gd.sEnd = G.time + 12; gd.chk = 0; gd.lk = 0; continue; } }
            gd.arr0 = 0;
            gd.ri = (gd.ri + 1) % gd.route.length; const w = gd.route[gd.ri]; if (!GD.go(gd, w[0], w[1])) { gd.ri = (gd.ri + 1) % gd.route.length; continue; } gd.arr = 1;
          }
          if (GD.step(gd, dt, (al ? 0.62 : 0.5) * (0.92 + 0.08 * k)) && gd.arr) { gd.arr = 0; gd.arr0 = 1; gd.wait = gd.route[gd.ri][2] || 0.5; }
        }
      }
    },
    // radio: chi insegue chiama i colleghi (allarme di squadra)
    radio(G, gd, r = 11, env) { if (env) { GD.alarm(G, gd, env); return; } for (const o of G.gd) if (o !== gd && o.st !== 'ko' && o.st !== 'chase' && Math.hypot(o.x - gd.x, o.y - gd.y) < r) GD.investigate(o, gd.lx, gd.ly, 'see'); },
    // telecamera: angolo adesso (gira avanti e indietro col tempo: uguale su tutti i telefoni)
    camA: (G, c) => c.a0 + c.sw * Math.sin(G.time * 2 * Math.PI / c.per + c.ph),
    camSees(G, c, x, y) {
      const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy); if (d > c.r || d < 0.4) return false;
      let a = Math.atan2(dy, dx) - GD.camA(G, c); a = Math.atan2(Math.sin(a), Math.cos(a));
      return Math.abs(a) < c.h && GD.los(c.x, c.y, x, y);
    },
    // online: [x, y, angolo, stato, sospetto, secondi di ko, chi insegue, punto visto, fumetto, secondi del fumetto]
    ST: ['pat', 'sus', 'inv', 'chase', 'ko', 'ret', 'srch', 'post'],
    snap: G => G.gd.map(g => [Math.round(g.x * 100) / 100, Math.round(g.y * 100) / 100, Math.round(g.a * 100) / 100, GD.ST.indexOf(g.st), Math.round(g.sus * 100) / 100, g.st === 'ko' ? Math.round((g.ko - G.time) * 10) / 10 : 0, g.tgt, g.w ? 1 : 0, g.bub ? g.bub.t : 0, g.bub ? Math.round((g.bub.e - G.time) * 10) / 10 : 0]),
    apply(G, a) {
      a.forEach((v, i) => {
        const g = G.gd[i]; if (!g) return;
        g.tx = v[0]; g.ty = v[1]; if (Math.hypot(g.tx - g.x, g.ty - g.y) > 3) { g.x = g.tx; g.y = g.ty; }
        g.ta = v[2]; g.st = GD.ST[v[3]] || 'pat'; g.sus = v[4]; g.ko = G.time + v[5]; g.tgt = v[6]; g.w = v[7];
        g.bub = v[8] ? { t: v[8], e: G.time + v[9] } : null;
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
    // FUMETTO sopra la testa (X, Y = piedi della guardia sullo schermo)
    bubble(g, gd, X, Y, TW, top = 2.6) {
      if (!gd.bub) return; const t = gd.bub.t; g.save(); g.font = '600 12px system-ui,sans-serif';
      const words = t.split(' '), lines = []; let cur = '';
      for (const w of words) { const s = cur ? cur + ' ' + w : w; if (g.measureText(s).width > 150 && cur) { lines.push(cur); cur = w; } else cur = s; } if (cur) lines.push(cur);
      const wd = Math.max(...lines.map(l => g.measureText(l).width)) + 16, ht = lines.length * 15 + 9, bx = X - wd / 2, by = Y - TW * top - ht;
      g.fillStyle = 'rgba(250,248,240,.94)'; cqRR(g, bx, by, wd, ht, 9); g.fill(); g.strokeStyle = 'rgba(40,40,50,.5)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(250,248,240,.94)'; g.beginPath(); g.moveTo(X - 6, by + ht - 0.5); g.lineTo(X + 6, by + ht - 0.5); g.lineTo(X, by + ht + 7); g.closePath(); g.fill();
      g.fillStyle = '#22242a'; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, X, by + 12 + i * 15)); g.restore();
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
    // sopra la testa: "?" che si riempie (sospetto) o "!" rosso (inseguimento); "…" quando va a controllare; 🔍 quando cerca; 🚧 quando presidia
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
      if (gd.st === 'srch' || gd.st === 'post') { g.fillStyle = 'rgba(20,20,26,.75)'; g.beginPath(); g.arc(X, y, 11, 0, 7); g.fill(); g.font = '13px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(gd.st === 'srch' ? '🔍' : '🚧', X, y + 1); return; }
      if (gd.st === 'inv') { g.fillStyle = 'rgba(20,20,26,.7)'; g.beginPath(); g.arc(X, y, 10, 0, 7); g.fill(); g.fillStyle = '#c8d0e0'; for (let i = 0; i < 3; i++) { g.globalAlpha = 0.4 + 0.6 * (((t * 2 - i * 0.3) % 1 + 1) % 1); g.beginPath(); g.arc(X - 5 + i * 5, y, 1.8, 0, 7); g.fill(); } g.globalAlpha = 1; }
    }
  };
})();
