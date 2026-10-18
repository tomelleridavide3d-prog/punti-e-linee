// Nascondino sul set (stile Prop Hunt). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Studio con le luci accese. 1-2 cercatori, gli altri si nascondono trasformandosi in un oggetto della mappa che hanno vicino (pianta, cassa, sedia...).
// I primi secondi i cercatori contano a schermo nero; poi caccia: "Colpisci" sull'oggetto piu' vicino. Se e' un nascosto -> coltellata (corpo a terra,
// diventa un fantasma); se e' un oggetto vero -> stordito 3 s (3 errori = fuori). Ogni ~30 s ogni nascosto fa un verso (suono + cerchio sulla mappa).
// Vincono i cercatori se trovano tutti, i nascosti se almeno uno resiste fino alla fine (o se i cercatori sono tutti fuori).
// Gancio del motore usato: prop(c) -> il personaggio si disegna come un oggetto (T.prop / drawProp).
(() => {
  const REACH = 1.3, STUN = 3, MAXERR = 3, CHG = 2, TAUNT = 30, RING = 2.5, HEAR = 12, SEE_S = 5.5, SEE_H = 3;   // HEAR = fin dove si sente il verso (caselle)
  // oggetti in cui ci si puo' trasformare (tipo -> nome), scelti dall'utente: mobili veri + vasi, cactus e coni (piu' difficili)
  const KINDS = { locker: 'armadietto', dchair: 'sedia', rack: 'appendiabiti', camera: 'cinepresa', lamp: 'faro', crate: 'cassa', crate2: 'cassa doppia',
    barrel: 'barile', fridge: 'frigo', tv: 'televisore', plant: 'vaso di fiori', cactus: 'cactus', cone: 'cono' };
  const art = k => (/^(cassa|sedia|cinepresa)/.test(KINDS[k]) ? 'una ' : 'un ') + KINDS[k];
  // il menu dei travestimenti: ogni tipo con i colori che ci sono sulla mappa (al massimo 4), cosi' ci si puo' confondere con quelli veri
  function variants() {
    const out = [], seen = {};
    for (const p of CQ_PROPS) {
      if (!KINDS[p[0]]) continue;
      const o = p[3] == null ? 0 : p[3], k = p[0] + JSON.stringify(o), n = seen[p[0]] || 0;
      if (seen[k] || n >= 4) continue; seen[k] = 1; seen[p[0]] = n + 1; out.push([p[0], o]);
    }
    return out.sort((a, b) => Object.keys(KINDS).indexOf(a[0]) - Object.keys(KINDS).indexOf(b[0]));
  }
  function menu(G) {
    const me = G.me, V = variants();
    cqCloseTask();
    $('#tkTitle').textContent = '🪑 Scegli l’oggetto da diventare';
    $('#tkBody').innerHTML = `<p class="hint">${hiding(G) ? 'Puoi cambiare quante volte vuoi finché i cercatori contano.' : 'Cambi rimasti: <b>' + (me.chg || 0) + '</b>'} Consiglio: mettiti vicino a oggetti uguali e resta fermo!</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:8px">${V.map((v, i) => `<button class="btn" type="button" data-v="${i}" style="padding:4px;display:flex;flex-direction:column;align-items:center;gap:2px${me.pr && me.pr[0] === v[0] && JSON.stringify(me.pr[1] || 0) === JSON.stringify(v[1]) ? ';outline:3px solid #9ad0ff' : ''}"><canvas width="140" height="170" style="width:70px;height:85px"></canvas><span style="font-size:12px">${KINDS[v[0]]}</span></button>`).join('')}</div>`;
    $('#tkHint').textContent = ''; $('#tkClose').hidden = false; $('#tkClose').onclick = cqCloseTask; $('#cqTask').hidden = false;
    $('#tkBody').querySelectorAll('[data-v]').forEach(b => {
      const v = V[+b.dataset.v], cv = b.querySelector('canvas'), g = cv.getContext('2d', CQ_CPU), TW = 34;
      g.setTransform(2, 0, 0, 2, 70, 128); cqTools(g, TW).prop(v[0], 0, 0, v[1] || undefined);
      b.onclick = () => { cqCloseTask(); pick(G, v); };
    });
  }
  // scelta dal menu (sul mio telefono; se sono un amico la mando anche all'host)
  function pick(G, v) {
    const me = G.me; if (!me.alive || G.phase !== 'play') return;
    if (G.guest) { if (!hiding(G) && (me.chg || 0) <= 0) return; me.pr = [v[0], v[1]]; if (!hiding(G)) me.chg--; me.prH = G.time + 1.2; cqNetSend({ k: 'pr', t: v[0], o: v[1] }); }
    else if (!morph(G, me, v[0], v[1])) return;
    beep(660, 0.06, 0.04); beep(990, 0.08, 0.04, 0.07);
  }
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const P = c => cqModePos(c);
  const dist = (a, b) => { const p = P(a), q = P(b); return Math.hypot(p.x - q.x, p.y - q.y); };
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const hiding = G => G.time < (G.opt.hide || 20);
  const hiders = G => G.chars.filter(c => c.r === 0 && c.alive);
  const stunned = (G, c) => (c.stun || 0) > G.time;
  // oggetti veri della mappa in cui ci si puo' trasformare: [tipo, x, y, opzione]
  // oggetti veri ancora sulla mappa (quelli tolti a inizio partita non contano)
  const props = () => CQ_PROPS.filter(p => KINDS[p[0]] && cqSolid[p[2]][p[1]] && cqSolid[p[2]][p[1]].prop === p[0]);
  // a ogni partita spariscono alcuni oggetti a caso (li sceglie l'host, gli amici li ricevono in gone): la memoria del set non basta
  function vanish(G, list) {
    G.gone = list; for (const [x, y] of list) if (cqSolid[y] && cqSolid[y][x] && cqSolid[y][x].prop) cqSolid[y][x] = null;
    cq.mapDirty = true; cq.bg = null;   // la mappa pronta si rifa' senza; alla prossima partita cqUseMap rimette tutto
  }
  const near = (x, y, r) => props().filter(p => Math.hypot(p[1] + 0.5 - x, p[2] + 0.5 - y) < r).sort((a, b) => Math.hypot(a[1] + 0.5 - x, a[2] + 0.5 - y) - Math.hypot(b[1] + 0.5 - x, b[2] + 0.5 - y));
  // dove si vede il nascosto: fermo = al centro della sua cella (come gli oggetti veri), mentre si muove = dov'e'
  const drawPos = c => { const p = P(c), mv = c === cq.g.me ? cq.walk : c.walk; return mv ? p : { x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5 }; };
  // un nascosto "stona" se non c'e' nessun oggetto vero uguale li' intorno
  const misfit = c => { const q = drawPos(c); return !props().some(p => p[0] === c.pr[0] && Math.hypot(p[1] + 0.5 - q.x, p[2] + 0.5 - q.y) < 2.6); };

  // cosa colpirebbe il cercatore s: il nascosto o l'oggetto vero piu' vicino entro REACH
  function target(G, s) {
    const p = P(s); let best = null, bd = REACH;
    for (const c of hiders(G)) { if (c === s) continue; const q = drawPos(c), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = { id: c.id, x: q.x, y: q.y }; } }
    for (const o of near(p.x, p.y, REACH)) { const d = Math.hypot(o[1] + 0.5 - p.x, o[2] + 0.5 - p.y); if (d < bd) { bd = d; best = { cx: o[1], cy: o[2], x: o[1] + 0.5, y: o[2] + 0.5 }; } }
    return best;
  }

  // cronaca: l'host scrive cosa succede (G.lg), tutti lo raccontano dal proprio punto di vista
  function say(G, k, a, b, x, y) { const e = { n: ++G.lgN, k, a, b }; if (x != null) { e.x = Math.round(x * 10) / 10; e.y = Math.round(y * 10) / 10; } G.lg.push(e); if (G.lg.length > 10) G.lg.shift(); show(G, e); }
  function show(G, e) {
    const me = G.me, A = byId(G, e.a), B = byId(G, e.b), an = A ? '<b>' + esc(A.name) + '</b>' : '', bn = B ? '<b>' + esc(B.name) + '</b>' : '', left = hiders(G).length;
    let t = '';
    if (e.k === 'tag') {
      t = A === me ? '🔪 ' + bn + ' ti ha trovato! Ora sei un fantasma: guarda come va a finire.' : B === me ? '🔪 Trovato ' + an + '!' : '🔪 ' + bn + ' ha trovato ' + an + '.';
      if (left) t += ' Ne ' + (left === 1 ? 'resta 1' : 'restano ' + left) + '.';
      for (let i = 0; i < 3; i++) beep(1300 - i * 120, 0.04, 0.035, i * 0.18, 'square');
    } else if (e.k === 'miss') {
      G.fx.push({ x: e.x, y: e.y, t: performance.now() });
      if (A === me) { beep(180, 0.25, 0.05, 0, 'sawtooth'); }
      else if (Math.hypot(e.x - cq.x, e.y - cq.y) < 10) beep(220, 0.12, 0.03, 0, 'sawtooth');
    } else if (e.k === 'out') { if (A !== me) t = '🚫 ' + an + ' ha sbagliato ' + MAXERR + ' volte: fuori!'; beep(200, 0.3, 0.04); }
    else if (e.k === 'snd') {   // verso di un nascosto: si sente da vicino, il cerchio si vede sulla mappa
      G.rings.push({ x: e.x, y: e.y, t: performance.now(), a: e.a });
      const d = A === me ? 0 : Math.hypot(e.x - cq.x, e.y - cq.y), v = 0.07 * Math.max(0, 1 - d / (HEAR + 1)), f = 520 + (e.a % 5) * 85;
      if (v > 0.004) { beep(f, 0.09, v, 0, 'triangle'); beep(f * 1.5, 0.13, v, 0.1, 'triangle'); beep(f * 1.2, 0.09, v, 0.25, 'triangle'); }
      if (A === me) t = '🔔 Hai fatto un verso: i cercatori sanno più o meno dove sei!';
    }
    if (t) cqToast(t);
  }

  function kill(G, v, s) {
    v.alive = false; v.pr = null; v.path = []; v.walk = 0; v.dt = G.time; s.kl = (s.kl || 0) + 1;
    const q = P(v); G.bodies.push({ id: v.id, x: q.x, y: q.y, face: v === G.me ? cq.face : v.face, look: cqLookOf(v), name: v.name, t: G.time });
    say(G, 'tag', v.id, s.id);
  }
  // colpo del cercatore s (host): tg = { id } nascosto oppure { cx, cy } oggetto vero
  function hit(G, s, tg) {
    if (!tg || s.r !== 1 || !s.alive || stunned(G, s) || hiding(G)) return;
    if (tg.id != null) { const v = byId(G, tg.id); if (v && v.r === 0 && v.alive && dist(s, v) < REACH + 0.7) return kill(G, v, s); }
    const p = tg.cx != null ? { x: tg.cx + 0.5, y: tg.cy + 0.5 } : P(s);
    s.err = (s.err || 0) + 1; s.stun = G.time + STUN; s.path = []; s.tg = null;
    say(G, 'miss', s.id, -1, p.x, p.y);
    if (s.err >= MAXERR) { s.alive = false; say(G, 'out', s.id, -1); }
  }
  // trasformazione del nascosto c nell'oggetto t con opzione o (host o da solo); nella caccia si puo' cambiare solo CHG volte
  function morph(G, c, t, o) {
    if (!KINDS[t] || c.r !== 0 || !c.alive) return false;
    if (!hiding(G)) { if ((c.chg || 0) <= 0) return false; c.chg--; }
    c.pr = [t, o == null ? 0 : o];
    return true;
  }

  // ---- personaggi del computer ----
  function go(c, x, y) { c.path = cqPath(c.x, c.y, x, y); if (!c.path.length) c.path = [[x, y]]; }
  // nascondiglio: una cella libera accanto a un oggetto (meglio se ce ne sono altri uguali vicino), lontano da chi e' da evitare
  function spot(G, c, avoid) {
    const L = props(), taken = new Set(G.chars.filter(o => o !== c && o.spot).map(o => o.spot.x + ',' + o.spot.y));
    let best = null, bs = -1e9;
    for (let i = 0; i < 40; i++) {
      const o = L[Math.floor(Math.random() * L.length)], [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)], x = o[1] + dx, y = o[2] + dy;
      if (!cqCellFree(x, y) || taken.has(x + ',' + y)) continue;
      const same = L.filter(p => p[0] === o[0] && Math.hypot(p[1] - o[1], p[2] - o[2]) < 3).length, d = Math.hypot(x - c.x, y - c.y);
      const sc = same * 2 + Math.random() * 3 - (d > 22 ? 4 : 0) + (avoid ? Math.min(10, Math.hypot(x - avoid.x, y - avoid.y)) : 0);
      if (sc > bs && cqPath(c.x, c.y, x + 0.5, y + 0.5).length) { bs = sc; best = { x, y, o }; }
    }
    return best;
  }
  function botHider(G, c) {
    if (!c.spot) { c.spot = spot(G, c); if (c.spot) go(c, c.spot.x + 0.5, c.spot.y + 0.5); }
    const sp = c.spot;
    if (sp && !c.path.length && Math.hypot(c.x - sp.x - 0.5, c.y - sp.y - 0.5) < 0.3) {
      if (!c.pr || (c.pr[0] !== sp.o[0] && (hiding(G) || c.chg > 0))) morph(G, c, sp.o[0], sp.o[3]);
    } else if (sp && !c.path.length) go(c, sp.x + 0.5, sp.y + 0.5);
    if (hiding(G)) { const o = near(c.x, c.y, 3)[0]; if (G.time > (G.opt.hide || 20) - 1.5 && !c.pr && o) morph(G, c, o[0], o[3]); return; }
    // un cercatore troppo vicino: ogni tanto si scappa (un oggetto che cammina si nota...)
    const s = G.chars.find(o => o.r === 1 && o.alive && dist(o, c) < 2.2);
    if (s && !c.path.length && Math.random() < 0.07) { const q = P(s), n = spot(G, c, q); if (n) { c.spot = n; go(c, n.x + 0.5, n.y + 0.5); } }
  }
  function botSeeker(G, c) {
    if (hiding(G) || stunned(G, c)) { c.path = []; return; }
    const tg = c.tg;
    if (tg) {
      const v = tg.id != null ? byId(G, tg.id) : null;
      if (tg.id != null && (!v || !v.alive)) c.tg = null;
      else {
        const q = v ? drawPos(v) : { x: tg.cx + 0.5, y: tg.cy + 0.5 }, d = Math.hypot(q.x - c.x, q.y - c.y);
        if (d < REACH * 0.85) { c.path = []; const t = target(G, c); c.tg = null; if (t) hit(G, c, t.id != null ? { id: t.id } : { cx: t.cx, cy: t.cy }); return; }
        if (!c.path.length || Math.random() < 0.3) { if (v) go(c, q.x, q.y); else { const f = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [tg.cx + a, tg.cy + b]).filter(([x, y]) => cqCellFree(x, y)).sort((a, b) => Math.hypot(a[0] - c.x, a[1] - c.y) - Math.hypot(b[0] - c.x, b[1] - c.y))[0]; if (f) go(c, f[0] + 0.5, f[1] + 0.5); else c.tg = null; } }
        if (G.time - tg.t > 12) c.tg = null;
        return;
      }
    }
    // chi sembra sospetto tra quelli che vedo (stessa stanza o vicino)
    const room = cqRoomOf[Math.floor(c.y)] && cqRoomOf[Math.floor(c.y)][Math.floor(c.x)];
    for (const h of hiders(G)) {
      const q = drawPos(h), d = Math.hypot(q.x - c.x, q.y - c.y); if (d > (G.opt.dk ? SEE_S - 0.5 : 7)) continue;
      const hr = cqRoomOf[Math.floor(q.y)] && cqRoomOf[Math.floor(q.y)][Math.floor(q.x)]; if (hr !== room && d > 3) continue;
      const pr = !h.pr ? 0.9 : h.walk ? 0.35 : 0.034 + (misfit(h) ? 0.12 : 0);
      if (Math.random() < pr) { c.tg = { id: h.id, t: G.time }; go(c, q.x, q.y); return; }
    }
    // a volte si sbaglia: un oggetto vero qui vicino sembra sospetto
    if ((c.err || 0) < 1 && Math.random() < 0.02) { const o = near(c.x, c.y, 4.5)[Math.floor(Math.random() * 3)]; if (o) { c.tg = { cx: o[1], cy: o[2], t: G.time }; return; } }
    // un verso sentito: si va a vedere
    const r = G.rings.filter(r => performance.now() - r.t < 8000 && Math.hypot(r.x - c.x, r.y - c.y) < HEAR * 1.25).pop();
    if (r && c.heard !== r) { c.heard = r; if (Math.random() < 0.8) { go(c, r.x, r.y); return; } }
    if (!c.path.length) { const f = cqModeFree(); if (f) go(c, f.x, f.y); }
  }

  // pulsante "Scegli l'oggetto" in alto al centro (come "Seleziona minigioco" della hall), solo per i nascosti vivi;
  // a inizio partita il menu si apre da solo una volta. Un controllo ogni 0,25 s lo mostra/nasconde (anche quando si esce dal gioco)
  function topBtn() {
    let b = document.getElementById("nsPick");
    if (!b) {
      b = document.createElement("button"); b.id = "nsPick"; b.type = "button"; b.className = "btn"; b.hidden = true;
      b.style.cssText = "position:absolute;top:112px;left:50%;transform:translateX(-50%);z-index:5;font-size:16px;font-weight:700;padding:10px 18px;background:#e0b84a;color:#2a1e08;border:0;border-radius:12px;box-shadow:0 3px 10px rgba(0,0,0,.35);white-space:nowrap";
      b.onclick = () => { const G = cq.g; if (G && G.mode === "nascondino") menu(G); };
      ($("#ciack") || document.body).appendChild(b);
    }
    const G = cq.g, me = G && G.me, on = !!(G && G.mode === "nascondino" && G.phase === "play" && me && me.r === 0 && me.alive && (hiding(G) || (me.chg || 0) > 0));
    if (on) {
      const t = hiding(G) ? "🪑 Scegli l'oggetto" : "🪑 Cambia oggetto (" + (me.chg || 0) + ")"; if (b.textContent !== t) b.textContent = t;
      if (!G.menuShown) { G.menuShown = true; if ($("#cqTask").hidden) menu(G); }   // la prima volta si apre da solo
    }
    if (on) { const mb = $("#cqModeBar").getBoundingClientRect(), pr = b.offsetParent ? b.offsetParent.getBoundingClientRect().top : 0, t = Math.round(mb.bottom - pr + 8) + "px"; if (mb.height && b.style.top !== t) b.style.top = t; }   // subito sotto la barra in alto
    if (b.hidden === on) b.hidden = !on;
    const ce = $("#cqCount"), ct = on ? Math.round(b.offsetTop + b.offsetHeight + 8) + "px" : "";   // la scritta grande del gioco va sotto il pulsante
    if (ce && ce.style.top !== ct) ce.style.top = ct;
  }
  if (!window.nsTopI) window.nsTopI = setInterval(topBtn, 250);

  CQ_MODES.nascondino = {
    n: 'Nascondino sul set',
    desc: '🪑 I <b>nascosti</b> scelgono da un menu in che oggetto trasformarsi (armadietto, sedia, attaccapanni, cinepresa, vaso, cono…), si muovono a forma di oggetto e si fermano dove si confondono meglio. I <b>cercatori</b> contano a schermo nero, poi colpiscono gli oggetti sospetti: se è un nascosto è eliminato, se è un oggetto vero restano storditi (3 errori = fuori). Ogni 30 secondi circa ogni nascosto fa un verso. 🤫 In vocale ti sentono da vicino: se ti nascondi, stai zitto!',
    maps: [['studio', 'Studio (luci accese)']],
    def: { time: 240, seek: 1, hide: 20, me: 'rnd', dark: 'on', map: 'studio', n: 8, fill: true },
    opts: o => `<div class="row"><div class="lbl">Cercatori</div>${seg('seek', [[1, '1'], [2, '2']], o.seek)}</div>
      <div class="row"><div class="lbl">Tempo per nascondersi</div>${seg('hide', [[15, '15 s'], [20, '20 s']], o.hide)}</div>${cq.net ? '' : '<div class="row"><div class="lbl">Il mio ruolo</div>' + seg('me', [['rnd', 'A caso'], ['h', 'Nascosto'], ['s', 'Cercatore']], o.me || 'rnd') + '</div>'}
      <div class="row"><div class="lbl">Durata della caccia</div>${seg('time', [[180, '3:00'], [240, '4:00'], [300, '5:00']], o.time)}</div>
      <div class="row"><div class="lbl">Luci</div>${seg('dark', [['on', 'Accese'], ['dark', 'Al buio'], ['rnd', 'A caso']], o.dark || 'on')}</div>`,
    read: d => ({ time: +d.get('time') || 240, seek: +d.get('seek') || 1, hide: +d.get('hide') || 20, me: d.get('me') || 'rnd', dark: d.get('dark') || 'on' }),
    start(G) {
      if (![15, 20].includes(G.opt.hide)) G.opt.hide = 20;
      G.opt = Object.assign({}, G.opt, { dk: G.opt.dark === 'dark' || (G.opt.dark === 'rnd' && Math.random() < 0.5) ? 1 : 0 });   // al buio? (a caso lo decide l'host, gli amici lo ricevono nelle opzioni)
      G.lg = []; G.lgN = 0; G.rings = []; G.fx = []; G.left = G.opt.time || 240;
      vanish(G, props().sort(() => Math.random() - 0.5).slice(0, 5 + Math.floor(Math.random() * 4)).map(p => [p[1], p[2]]));
      const sh = G.chars.slice().sort(() => Math.random() - 0.5), mr = cq.net ? 'rnd' : G.opt.me; if (mr !== 'rnd') { sh.splice(sh.indexOf(G.me), 1); if (mr === 's') sh.unshift(G.me); else sh.push(G.me); } const ns = Math.min(G.opt.seek || 1, Math.max(1, Math.floor(G.chars.length / 3)));
      sh.forEach((c, i) => { c.r = i < ns ? 1 : 0; c.pr = null; c.chg = CHG; c.stun = 0; c.err = 0; c.kl = 0; c.spot = null; c.tg = null; c.nt = (G.opt.hide || 20) + 12 + Math.random() * 18; });
    },
    gstart(G) { G.lg = []; G.lgN = 0; G.rings = []; G.fx = []; G.left = G.opt.time || 240; for (const c of G.chars) { c.pr = null; c.r = 0; } },
    intro: G => (G.opt.dk ? '🌑 Al buio! ' : '') + (G.me.r === 1 ? '🔎 Sei il cercatore: conta, poi trovali!' : '🪑 Nasconditi: diventa un oggetto!'),
    speed: c => { const G = cq.g; return c.r === 1 && (hiding(G) || stunned(G, c)) ? 0 : 1; },
    big(G) {
      const me = G.me, h = Math.ceil((G.opt.hide || 20) - G.time);
      if (me.r === 1) { if (!me.alive) return '🚫 Sei fuori'; if (hiding(G)) return '🙈 Stai contando… ' + h; if (stunned(G, me)) return '❤️'.repeat(Math.max(0, MAXERR - (me.err || 0))); return ''; }   // colpo sbagliato: al centro solo i cuori rimasti
      if (!me.alive) return '';
      if (hiding(G)) return (me.pr ? '🤫 Sei ' + art(me.pr[0]) + '. ' : '🪑 Scegli l’oggetto da diventare! ') + 'I cercatori partono tra ' + h;
      const nt = (me.nt || 0) - G.time; if (nt > 0 && nt < 5) return '🔔 Tra ' + Math.ceil(nt) + ' farai un verso!';
      return '';
    },
    hud(G) {
      const me = G.me, n = hiders(G).length, tot = G.chars.filter(c => c.r === 0).length, tm = hiding(G) ? '🙈 ' + mmss(Math.max(0, (G.opt.hide || 20) - G.time)) : '⏱ ' + mmss(Math.max(0, G.left));
      if (me.r === 1) return `🔎 <b style="color:#ff9a7a">Cercatore</b> · trovati ${tot - n}/${tot} · vite ${"❤️".repeat(Math.max(0, MAXERR - (me.err || 0))) || "💀"} · ${tm}`;
      return `🪑 <b style="color:#9ad0ff">Nascosto</b>${me.alive ? me.pr ? ' (' + KINDS[me.pr[0]] + ')' : '' : ' · 👻 trovato'} · ancora nascosti ${n}/${tot}${me.alive && !hiding(G) ? ' · cambi ' + (me.chg || 0) : ''} · ${tm}`;
    },
    nameCol: c => c.r === 1 ? '#ff9a7a' : null,
    // travestito: si disegna come l'oggetto; il nome lo vedono solo gli altri nascosti (e i fantasmi)
    prop(c) {
      const G = cq.g; if (!c.alive || !c.pr || G.phase === 'end') return null;
      const q = drawPos(c); return [c.pr[0], c.pr[1] || undefined, c === G.me || G.me.r === 0 || !G.me.alive, q.x, q.y];
    },
    btn(G) {
      const me = G.me; if (!me.alive) return null;
      if (me.r === 1) return hiding(G) ? null : { t: '🔪 Colpisci', on: !stunned(G, me) && !!target(G, me) };
      return null;   // i nascosti usano il pulsante in alto al centro (topBtn)
    },
    act(G) {
      const me = G.me; if (!me.alive) return;
      if (me.r === 1) {
        if (hiding(G) || stunned(G, me) || G.time < (me.hitH || 0)) return;
        const t = target(G, me); if (!t) return; me.hitH = G.time + 0.6;
        const tg = t.id != null ? { id: t.id } : { cx: t.cx, cy: t.cy };
        beep(900, 0.04, 0.04, 0, 'square');
        if (G.guest) cqNetSend(Object.assign({ k: 'hit' }, tg)); else hit(G, me, tg);
        return;
      }
      if (hiding(G) || (me.chg || 0) > 0) menu(G);
    },
    ev(G, c, o) {
      if (!o) return;
      if (o.k === 'hit') hit(G, c, o.id != null ? { id: o.id } : { cx: o.cx, cy: o.cy });
      else if (o.k === 'pr') morph(G, c, o.t, o.o);
    },
    tick(G, dt) {
      if (!hiding(G)) G.left -= dt;
      // versi dei nascosti (cerchio un po' spostato: si sa piu' o meno dove)
      if (!hiding(G)) for (const c of hiders(G)) if (G.time >= c.nt) {
        const p = P(c); c.nt = G.time + TAUNT * (0.4 + 0.6 * Math.max(0, G.left) / (G.opt.time || 240)) * (0.85 + Math.random() * 0.3);   // verso la fine sempre piu' spesso (da ~30 a ~12 s)
        say(G, 'snd', c.id, -1, p.x + (Math.random() - 0.5) * 1.6, p.y + (Math.random() - 0.5) * 1.6);
      }
      for (const c of G.chars) {
        if (!c.bot || !c.alive) continue;
        if ((c.think -= dt) <= 0) { c.think = 0.45 + Math.random() * 0.15; c.r === 1 ? botSeeker(G, c) : botHider(G, c); }
        cqModeStep(c, dt, c.r === 1 ? (hiding(G) || stunned(G, c) ? 0 : 1) : 0.95);
      }
      if (!hiders(G).length) this.finish(G, 1);
      else if (!G.chars.some(c => c.r === 1 && c.alive)) this.finish(G, 0, 'i cercatori sono tutti fuori.');
      else if (G.left <= 0) this.finish(G, 0, 'tempo finito.');
    },
    finish(G, w, why) {
      const name = c => c.name + (c === G.me ? ' (tu)' : ''), tot = G.chars.filter(c => c.r === 0).length, n = hiders(G).length;
      const line = c => [name(c), c.r === 1 ? '— 🔎 cercatore · 🔪 ' + (c.kl || 0) + ' trovati · ❌ ' + (c.err || 0) + ' errori' : '— 🪑 ' + (c.alive ? 'mai trovato!' : 'trovato dopo ' + mmss(Math.max(0, (c.dt || 0) - (G.opt.hide || 20))))];
      const score = c => c.r === 1 ? (c.kl || 0) * 10 - (c.err || 0) : (c.alive ? 1e4 : c.dt || 0);
      const rank = G.chars.slice().sort((x, y) => ((y.r === w) - (x.r === w)) || score(y) - score(x)).map(line);
      if (w === 1) cqModeEnd({ t: '🔎 Vincono i cercatori!', why: 'Hanno trovato tutti i ' + tot + ' nascosti.', win: G.chars.filter(c => c.r === 1).map(c => c.id), rank });
      else cqModeEnd({ t: '🪑 Vincono i nascosti!', why: (n === 1 ? '1 nascosto' : n + ' nascosti') + ' su ' + tot + ' mai trovati · ' + why, win: G.chars.filter(c => c.r === 0).map(c => c.id), rank });
    },
    // online: ruolo, oggetto, cambi rimasti, stordimento, errori, trovati, secondi al prossimo verso
    csnap: c => { const G = cq.g; return [c.r, c.pr || 0, c.chg || 0, Math.max(0, Math.round(((c.stun || 0) - G.time) * 10) / 10), c.err || 0, c.kl || 0, Math.round(((c.nt || 0) - G.time) * 10) / 10]; },
    capply(G, c, a) {
      c.r = a[0]; if (!(c === G.me && G.time < (c.prH || 0))) { c.pr = a[1] || null; c.chg = a[2]; }
      c.stun = a[3] > 0 ? G.time + a[3] : 0; c.err = a[4]; c.kl = a[5]; c.nt = G.time + a[6];
      if (!c.alive) c.pr = null;
    },
    snap: G => ({ go: G.gone, bd: G.bodies.map(b => [b.id, Math.round(b.x * 100) / 100, Math.round(b.y * 100) / 100, b.face, Math.round(b.t * 10) / 10]), left: Math.round(G.left * 10) / 10, lg: G.lg }),
    apply(G, x) {
      if (x.bd) G.bodies = x.bd.map(a => { const c = byId(G, a[0]); return c ? { id: a[0], x: a[1], y: a[2], face: a[3], t: a[4], look: cqLookOf(c), name: c.name } : null; }).filter(Boolean);
      G.left = x.left; if (x.go && !G.gone) vanish(G, x.go);
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
    },
    // cercatori mentre contano: schermo nero (e nessuno si vede).
    // Al buio (G.opt.dk): i cercatori hanno la torcia (vedono fino a SEE_S, fascio davanti), i nascosti vedono poco (SEE_H) ma vedono sempre i cercatori e le loro torce
    night(G) {
      const me = G.me;
      if (me.r === 1 && me.alive && hiding(G)) return { a: 1, r: 0.01, lights: [], see: () => false };
      if (!G.opt.dk || !me.alive) return null;
      const lights = [], S = me.r === 1;
      for (const c of G.chars) if (c !== me && c.r === 1 && c.alive && Math.hypot(c.x - cq.x, c.y - cq.y) < 20) lights.push([c.x, c.y, 3.2, 0.85]);
      if (S) { const l = Math.hypot(cq.wdx || 0, cq.wdy || 0) || 1, dx = (cq.wdx || 0.5) / l, dy = (cq.wdy || 0.5) / l; lights.push([cq.x + dx * 2.6, cq.y + dy * 2.6, 3.4, 0.9]); }
      return { a: 0.94, r: S ? 4.4 : 2.4, lights,
        see: (x, y) => {
          if (Math.hypot(x - cq.x, y - cq.y) < (S ? SEE_S : SEE_H)) return true;
          const c = G.chars.find(o => o.x === x && o.y === y); return !!c && c.r === 1 && !S;
        } };
    },
    // sopra alla mappa: versi (cerchi), colpi a vuoto, cosa sto per colpire / in cosa mi trasformo
    over(g, G, sx, sy, TW) {
      const me = G.me, now = performance.now(), W = cq.w, H = cq.h;
      if (me.r === 1 && me.alive && hiding(G)) { g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H); return; }
      const ring = (x, y, r) => { g.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI * 2, X = sx(x + Math.cos(t) * r, y + Math.sin(t) * r), Y = sy(x + Math.cos(t) * r, y + Math.sin(t) * r); i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); };
      G.rings = G.rings.filter(r => now - r.t < 9000);
      for (const r of G.rings) {
        const a = (now - r.t) / 1000; if (a > RING || (r.a !== me.id && me.alive && Math.hypot(r.x - cq.x, r.y - cq.y) > HEAR + 1)) continue;   // troppo lontano: non si sente e non si vede
        for (const k of [0, 0.4]) { const f = (a + k) % 1.2 / 1.2; ring(r.x, r.y, 0.5 + f * 2); g.strokeStyle = 'rgba(255,214,90,' + (0.9 * (1 - f) * (1 - a / RING)) + ')'; g.lineWidth = 3; g.stroke(); }
        const X = sx(r.x, r.y), Y = sy(r.x, r.y) - TW * 1.2; g.font = '20px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = 1 - a / RING; g.fillText('🔔', X, Y); g.globalAlpha = 1;
        if (me.r === 1) edge(g, X, Y, W, H, '🔔', '#e8b830');
      }
      G.fx = G.fx.filter(f => now - f.t < 1000);
      for (const f of G.fx) { const a = (now - f.t) / 1000; g.globalAlpha = 1 - a; g.font = '26px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('❌', sx(f.x, f.y), sy(f.x, f.y) - TW * (1 + a * 0.6)); g.globalAlpha = 1; }
      if (!me.alive || G.phase !== 'play' || G.pre > 0) return;
      // contorno su cio' che il pulsante colpirebbe (cercatore)
      const q = me.r === 1 ? target(G, me) : null, col = '#ff6a5a';
      if (q) {
        const pu = 0.6 + 0.4 * Math.sin(now / 160);
        g.strokeStyle = col; g.globalAlpha = pu; g.lineWidth = 3; g.beginPath();
        [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].forEach(([a, b], i) => { const X = sx(q.x + a, q.y + b), Y = sy(q.x + a, q.y + b); i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
        g.closePath(); g.stroke(); g.globalAlpha = 1;
      }
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
})();
