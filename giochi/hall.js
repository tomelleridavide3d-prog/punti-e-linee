// ==== PASSATEMPI DELLA HALL: CARAMELLE PAZZE (23-10-2026, piano in CLAUDE.md "PIANO PASSATEMPI DELLA HALL") ====
// Distributore = prop 'candy' in 11,1 di cqMapHotel (disegnato in giochi/lib/pixel.js). Ogni caramella costa SEMPRE 2 monete ed esce a caso tra 10;
// effetto 30 secondi, SOLO nella hall (quando parte un minigioco sparisce: HL.off da cqHallUI(false)).
// Online: il mio effetto va in hl.cy (cqHallPub), gli altri lo leggono in c.cy (cqHallNet) e lo disegnano. Le spinte del Gigante e il contagio della
// Zombina li calcola ogni telefono per se' (chi viene toccato si sposta / diventa verde da solo): niente messaggi in piu'.
// Ganci nel motore: HL.dir / HL.spd / HL.moved (movimento in cqFrame), cq.fly (cqBlocked: si passa sopra i mobili), HL.tick (cqHallTick),
// HL.look (cqDraw: disegno del personaggio con l'effetto), HL.pow (schiaffo della Superforza), HL.pub (campo cy), HL.off.
window.HL = (() => {
  const CANDY = { x: 11.5, y: 2.5 }, DUR = 30, COST = 2, GREEN = 10, RANGE = 3;
  const K = {
    mini: { e: '🔵', n: 'Mini', d: 'Piccolo piccolo e velocissimo… con la vocina!', s: 0.55, v: 1.5, c: '#3a7ae8' },
    big: { e: '🟤', n: 'Gigante', d: 'Enorme e lento: chi tocchi vola via!', s: 1.75, v: 0.62, c: '#8a5a3a' },
    forza: { e: '💪', n: 'Superforza', d: 'Schiaffi tre volte più forti: provane uno!', s: 1.08, v: 1, c: '#e84a4a' },
    fly: { e: '🎈', n: 'Fluttuante', d: 'Galleggi a mezz\'aria: passi sopra i divani!', s: 1, v: 0.95, c: '#ff7ac8' },
    rimb: { e: '🏀', n: 'Rimbalzina', d: 'Rimbalzi su muri e mobili e non ti fermi più!', s: 1, v: 1.3, c: '#ff9a3a' },
    invis: { e: '👻', n: 'Invisibile', d: 'Gli altri vedono solo un luccichio e le tue impronte.', s: 1, v: 1, c: '#e8f0ff' },
    fulm: { e: '⚡', n: 'Fulmine', d: 'Velocità doppia, con la scia elettrica!', s: 1, v: 2, c: '#f0c040' },
    arc: { e: '🌈', n: 'Arcobaleno', d: 'Cambi colore di continuo e lasci la scia arcobaleno.', s: 1, v: 1.1, c: 'rainbow' },
    matta: { e: '🌀', n: 'Testa matta', d: 'Comandi al contrario! Buona fortuna…', s: 1, v: 1, c: '#9a5ae8' },
    zomb: { e: '🧟', n: 'Zombina', d: 'Sei uno zombie: chi tocchi diventa verde!', s: 1, v: 0.85, c: '#4ac868' },
  };
  const IDS = Object.keys(K), TRAIL = { fulm: 0.45, arc: 0.6, invis: 2.6 };
  const S = { k: null, end: 0, green: 0, by: '', anim: false, rb: null, shove: null, hit: {}, tr: new Map(), last: null, uiT: 0 };
  const now = () => performance.now() / 1000;
  const myKind = () => S.k && now() < S.end ? S.k : now() < S.green ? 'verde' : null;
  const kindOf = c => { const G = cq.g; if (!G || !G.hall) return null; if (c === G.me) return myKind(); return K[c.cy] || c.cy === 'verde' ? c.cy : null; };
  const near = () => Math.hypot(cq.x - CANDY.x, cq.y - CANDY.y) < 1.35;
  const posOf = c => c === cq.g.me ? [cq.x, cq.y] : [c.x, c.y];

  // ---- schermata della caramella che scende (DOM + animazioni CSS: niente cicli accesi) ----
  const css = document.createElement('style');
  css.textContent = `
#hlCandyB{position:absolute;right:18px;bottom:244px;font-size:16px;font-weight:700;padding:11px 15px;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.35);background:linear-gradient(#ff8ac8,#d8508a);color:#fff;border:2px solid #ffd0e8}
#hlFx{position:absolute;left:50%;top:58px;transform:translateX(-50%);background:rgba(20,16,30,.86);color:#fff;border-radius:999px;padding:6px 14px;font:700 14px system-ui,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,.35);border:2px solid var(--hc,#fff);pointer-events:none;white-space:nowrap;z-index:6}
#hlFx.blink{animation:hlBl .5s steps(2) infinite}@keyframes hlBl{50%{opacity:.45}}
#hlCandy{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,6,20,.55);z-index:40}
#hlCandy .hcBox{position:relative;width:260px;height:340px}
#hlCandy .hcGlobe{position:absolute;left:55px;top:10px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.75),rgba(200,230,255,.25) 30%,rgba(160,200,240,.2));border:4px solid #e8f4fc;overflow:hidden;animation:hcShake .5s ease-in-out 2}
#hlCandy .hcGlobe i{position:absolute;width:20px;height:20px;border-radius:50%;box-shadow:inset -3px -3px 0 rgba(0,0,0,.25),inset 3px 3px 0 rgba(255,255,255,.35)}
#hlCandy .hcBase{position:absolute;left:70px;top:150px;width:120px;height:110px;background:linear-gradient(90deg,#d8343e,#a82028);border:4px solid #c8a050;border-radius:10px}
#hlCandy .hcKnob{position:absolute;left:44px;top:18px;width:32px;height:32px;border-radius:50%;background:#e8dcbc;border:3px solid #8a6a2c;animation:hcTurn .9s ease-in-out}
#hlCandy .hcKnob:after{content:'';position:absolute;left:12px;top:-2px;width:6px;height:32px;background:#8a6a2c;border-radius:3px}
#hlCandy .hcChute{position:absolute;left:38px;top:66px;width:44px;height:30px;background:#2a1418;border:3px solid #c8a050;border-radius:6px 6px 14px 14px}
#hlCandy .hcBall{position:absolute;left:116px;top:228px;width:28px;height:28px;border-radius:50%;opacity:0;box-shadow:inset -4px -4px 0 rgba(0,0,0,.25),inset 4px 4px 0 rgba(255,255,255,.45);animation:hcDrop 1.5s cubic-bezier(.3,.1,.4,1) .7s forwards}
#hlCandy .hcTxt{position:absolute;left:-30px;right:-30px;top:110px;text-align:center;color:#fff;opacity:0;transform:scale(.6);animation:hcPop .45s cubic-bezier(.2,1.6,.5,1) 2.05s forwards;text-shadow:0 2px 6px rgba(0,0,0,.6)}
#hlCandy .hcTxt .hcE{font-size:64px;line-height:1.1}#hlCandy .hcTxt b{display:block;font-size:30px;margin:4px 0}#hlCandy .hcTxt div.hcD{font-size:16px;font-weight:600;padding:0 10px}#hlCandy .hcTxt small{display:block;margin-top:8px;opacity:.8}
#hlCandy .hcBox.done .hcGlobe,#hlCandy .hcBox.done .hcBase{transition:opacity .3s;opacity:.12}
@keyframes hcShake{25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}
@keyframes hcTurn{to{transform:rotate(360deg)}}
@keyframes hcDrop{0%{opacity:1;transform:translate(0,0) scale(.8)}25%{transform:translate(0,46px) scale(1)}40%{transform:translate(0,30px)}55%{transform:translate(0,46px)}70%{opacity:1;transform:translate(0,40px) scale(1.4)}100%{opacity:0;transform:translate(0,-60px) scale(4)}}
@keyframes hcPop{to{opacity:1;transform:scale(1)}}`;
  document.head.appendChild(css);
  const ballBg = c => c === 'rainbow' ? 'conic-gradient(#e84a4a,#f0c040,#4ac868,#40d8e8,#3a7ae8,#9a5ae8,#e84a4a)' : c;
  function show(k) {
    const box = document.getElementById('ciack'); let el = document.getElementById('hlCandy'); if (el) el.remove();
    const D = K[k], dots = Array.from({ length: 34 }, (_, i) => `<i style="left:${(i % 7) * 21 + (Math.floor(i / 7) % 2) * 10 - 4}px;top:${44 + Math.floor(i / 7) * 19}px;background:${ballBg(K[IDS[(i * 7 + 3) % 10]].c)}"></i>`).join('');
    el = document.createElement('div'); el.id = 'hlCandy';
    el.innerHTML = `<div class="hcBox"><div class="hcGlobe">${dots}</div><div class="hcBase"><div class="hcKnob"></div><div class="hcChute"></div></div><div class="hcBall" style="background:${ballBg(D.c)}"></div>`
      + `<div class="hcTxt"><div class="hcE">${D.e}</div><b>${D.n}</b><div class="hcD">${D.d}</div><small>⏱ ${DUR} secondi · solo nella hall</small></div></div>`;
    box.appendChild(el);
    setTimeout(() => { const b = el.querySelector('.hcBox'); if (b) b.classList.add('done'); }, 2050);
    const close = () => { if (el.parentNode) el.remove(); };
    setTimeout(() => { el.onclick = close; }, 2300); setTimeout(close, 4600);
  }

  // ---- comprare e applicare ----
  function buy() {
    const G = cq.g; if (!G || !G.hall || S.anim || !G.me.alive || !near()) return;
    const b = cqBank(); if (b.coins < COST) { cqToast('🍬 Una caramella costa <b>' + COST + ' 🪙</b> e ne hai ' + b.coins + '. Le monete si vincono nei minigiochi!'); beep(220, 0.14, 0.04); return; }
    cqCoins(-COST);
    let k = IDS[Math.floor(Math.random() * IDS.length)]; if (k === S.last) k = IDS[Math.floor(Math.random() * IDS.length)];   // raramente due uguali di fila
    S.anim = true; show(k);
    beep(1320, 0.05, 0.04); beep(1760, 0.08, 0.035, 0.06);   // moneta
    for (let i = 0; i < 6; i++) setTimeout(() => thud(0.24, 700 + i * 40 + (i % 2) * 180), 250 + i * 110);   // manopola che gira
    setTimeout(() => { beep(520, 0.05, 0.04); beep(390, 0.07, 0.04, 0.2); beep(470, 0.06, 0.035, 0.36); }, 1250);   // la caramella rotola e rimbalza
    setTimeout(() => { S.anim = false; apply(k); }, 2050);
  }
  function apply(k) {
    const G = cq.g; if (!G || !G.hall) return;
    const was = S.k; S.k = k; S.end = now() + DUR; S.last = k; S.rb = null; S.hit = {};
    if (k === 'zomb') S.green = 0;
    if (was === 'fly' && k !== 'fly') land();
    [0, 4, 7, 12].forEach((n, i) => beep(523 * Math.pow(2, n / 12), 0.16, 0.04, i * 0.08, 'triangle'));
    if (cq.net) cqHallPub(true);
  }
  function end() {
    const k = S.k; S.k = null; S.end = 0;
    if (k === 'fly') land();
    if (k && cq.g && cq.g.hall) { cqToast(K[k].e + ' L\'effetto della caramella è finito.'); beep(660, 0.1, 0.03); beep(440, 0.16, 0.03, 0.1); }
    if (cq.net) cqHallPub(true);
  }
  // fine del volo sopra un divano: giu' nella casella libera piu' vicina
  function land() {
    cq.fly = false; if (cqFree(cq.x, cq.y)) return;
    for (let r = 0.25; r <= 4; r += 0.25) for (let a = 0; a < 16; a++) { const x = cq.x + Math.cos(a * Math.PI / 8) * r, y = cq.y + Math.sin(a * Math.PI / 8) * r; if (cqFree(x, y)) { cq.x = x; cq.y = y; return; } }
  }

  // ---- movimento (cqFrame) ----
  function dir(d) {
    const k = myKind();
    if (k === 'matta' && d) d = { wx: -d.wx, wy: -d.wy, sx: -d.sx, sy: -d.sy };
    if (k === 'rimb') {
      if (d) S.rb = { x: d.wx, y: d.wy };
      else if (S.rb) d = { wx: S.rb.x, wy: S.rb.y, sx: S.rb.x - S.rb.y, sy: S.rb.x + S.rb.y };
    }
    return d;
  }
  const spd = () => { const k = myKind(); return k && K[k] ? K[k].v : 1; };
  function moved(bx, by) {   // bx/by: il passo si e' fermato contro qualcosa in orizzontale / verticale
    if (myKind() !== 'rimb' || !S.rb || (!bx && !by)) return;
    if (bx) S.rb.x = -S.rb.x; if (by) S.rb.y = -S.rb.y;
    const a = Math.atan2(S.rb.y, S.rb.x) + (Math.random() - 0.5) * 0.5; S.rb = { x: Math.cos(a), y: Math.sin(a) };   // un po' storto: non resta incastrato
    thud(0.35, 380 + Math.random() * 120); beep(300 + Math.random() * 80, 0.05, 0.03, 0, 'sine');
  }
  // forza dello schiaffo (cqHallPrank): 3 volte con la Superforza
  const pow = () => myKind() === 'forza' ? 3 : 1;
  const pub = () => myKind() || 0;

  // ---- ogni fotogramma nella hall ----
  function tick(G, dt) {
    const t = now(), me = G.me;
    if (S.k && t >= S.end) end();
    cq.fly = myKind() === 'fly';
    // scie e impronte di chi ha un effetto che le lascia
    for (const c of G.chars) {
      const k = kindOf(c), life = TRAIL[k]; if (!life || !c.alive) { S.tr.delete(c.id); continue; }
      const [x, y] = posOf(c); let a = S.tr.get(c.id); if (!a) S.tr.set(c.id, a = []);
      const l = a[a.length - 1]; if (!l || Math.hypot(l.x - x, l.y - y) > (k === 'invis' ? 0.42 : 0.14)) a.push({ x, y, t, n: (l ? l.n : 0) + 1 });
      while (a.length && (t - a[0].t > life || a.length > 30)) a.shift();
    }
    // gli altri su di me: il Gigante mi spinge via, la Zombina mi fa diventare verde
    if (me.alive && cq.sit == null) for (const c of G.chars) {
      if (c === me || !c.alive) continue;
      const k = kindOf(c), dx = cq.x - c.x, dy = cq.y - c.y, d = Math.hypot(dx, dy);
      if (k === 'big' && myKind() !== 'big' && d < 1.05 && !S.shove) { const l = d || 1; S.shove = { x: dx / l || 1, y: dy / l, t: 0.32 }; thud(0.8, 160); beep(140, 0.12, 0.05, 0, 'square'); cqToast('🟤 <b>' + esc(c.name || '') + '</b> gigante ti ha spinto via!'); }
      if (k === 'zomb' && myKind() !== 'zomb' && d < 0.8 && t >= S.green) { S.green = t + GREEN; S.by = c.name || ''; c.zt = G.time; beep(180, 0.2, 0.05, 0, 'sawtooth'); beep(140, 0.3, 0.05, 0.15, 'sawtooth'); cqToast('🧟 <b>' + esc(S.by) + '</b> ti ha contagiato: sei verde per ' + GREEN + ' secondi!'); if (cq.net) cqHallPub(true); }
    }
    // io Gigante / Zombina: il colpo si sente anche sul mio telefono
    const mk = myKind();
    if (mk === 'big' || mk === 'zomb') for (const c of G.chars) {
      if (c === me || !c.alive || (S.hit[c.id] || 0) > t) continue;
      const d = Math.hypot(cq.x - c.x, cq.y - c.y);
      if (mk === 'big' && d < 1.05) { S.hit[c.id] = t + 1.2; thud(0.7, 180); }
      if (mk === 'zomb' && d < 0.8 && kindOf(c) !== 'verde') { S.hit[c.id] = t + GREEN; c.zt = G.time; beep(200, 0.15, 0.04, 0, 'sawtooth'); cqToast('🧟 Hai contagiato <b>' + esc(c.name || '') + '</b>!'); }
    }
    if (S.shove) {   // spinta: scivolo via veloce, fermandomi contro muri e mobili
      const sv = S.shove, st = Math.min(dt, sv.t), nx = cq.x + sv.x * 7 * st, ny = cq.y + sv.y * 7 * st;
      if (cqFree(nx, cq.y)) cq.x = nx; if (cqFree(cq.x, ny)) cq.y = ny;
      if ((sv.t -= dt) <= 0) S.shove = null;
    }
    if ((S.uiT -= dt) <= 0) { S.uiT = 0.1; hud(G); }
  }
  function hud(G) {
    const box = document.getElementById('ciack'); if (!box) return;
    let b = document.getElementById('hlCandyB'), p = document.getElementById('hlFx');
    if (!b) { b = document.createElement('button'); b.id = 'hlCandyB'; b.className = 'btn'; b.type = 'button'; b.hidden = true; b.onclick = buy; box.appendChild(b); }
    if (!p) { p = document.createElement('div'); p.id = 'hlFx'; p.hidden = true; box.appendChild(p); }
    const on = !!(G && G.hall && G.me.alive && cqHallFree() && cq.sit == null && near() && !S.anim);
    if (b.hidden === on) b.hidden = !on;
    const bt = '🍬 Caramella · ' + COST + ' 🪙'; if (b.textContent !== bt) b.textContent = bt;
    const k = myKind(), left = k === 'verde' ? S.green - now() : S.end - now();
    const txt = k ? (k === 'verde' ? '🧟 Verde (contagiato) · ' : K[k].e + ' ' + K[k].n + ' · ') + Math.ceil(left) + 's' : '';
    if (p.hidden === !!txt) p.hidden = !txt;
    if (txt && p.textContent !== txt) { p.textContent = txt; p.style.setProperty('--hc', k === 'verde' ? '#6f9a3e' : K[k].c === 'rainbow' ? '#ff7ac8' : K[k].c); }
    p.classList.toggle('blink', !!k && left < 5);
  }
  function off() {
    S.k = null; S.end = 0; S.green = 0; S.anim = false; S.rb = null; S.shove = null; S.tr.clear(); cq.fly = false;
    for (const id of ['hlCandyB', 'hlFx', 'hlCandy']) { const e = document.getElementById(id); if (e) { if (id === 'hlCandy') e.remove(); else e.hidden = true; } }
  }

  // ---- disegno (cqDraw): il personaggio con l'effetto si disegna qui (o.dr), riquadro allargato per scie e impronte ----
  function look(o, c) {
    const k = kindOf(c); if (!k) return;
    const me = c === cq.g.me, D = K[k] || {}, s = D.s || 1, a = S.tr.get(c.id), lift = k === 'fly' ? 0.8 : 0, ext = TRAIL[k] ? 1.7 : 0.35;
    if (k === 'invis' && !me) o.name = null;
    if (o.bub && o.bub.t && (k === 'mini' || k === 'big')) o.bub = { u: o.bub.u, t: k === 'mini' ? o.bub.t.toLowerCase() + ' ♪' : o.bub.t.toUpperCase() + '!!' };   // vocina / vocione
    if (k === 'fly') o.d = (o.d != null ? o.d : o.x + o.y) + 1.2;   // in volo passa davanti ai divani
    const P = { k, s, me, id: c.id, a, x: o.x, y: o.y, sitK: o.sitK || 0, sw: o.sw, lift };
    o.dr = (g, X, Y, TW, L, w, f) => draw(g, X, Y, TW, L, w, f, P);
    o.dr.box = [1.3 * s + ext, 2.6 * s + lift + (k === 'matta' ? 0.6 : 0.3) + (TRAIL[k] ? 0.8 : 0), 0.5 + ext * 0.55];
    o.dr.top = cqTop(o.L) * s + lift + (k === 'matta' ? 0.4 : 0) + (k === 'rimb' ? 0.3 : 0);
  }
  const ZT = { c: '#5e8a2e', a: 0.55, rot: 1 };
  function draw(g, X, Y, TW, L, w, f, P) {
    const u = TW / 34, t = now(), k = P.k, TH = TW / 2;
    const sxy = p => [X + ((p.x - P.x) - (p.y - P.y)) * TW / 2, Y + ((p.x - P.x) + (p.y - P.y)) * TH / 2];
    const pts = (P.a || []).filter(p => Math.hypot(p.x - P.x, p.y - P.y) < RANGE), life = TRAIL[k] || 1;
    // scie e impronte (dietro al personaggio)
    if (k === 'fulm' && pts.length) {
      const q = pts.map(sxy).concat([[X, Y]]);
      for (const [lw, col] of [[4.2 * u, 'rgba(120,210,255,.55)'], [2 * u, '#fff7a0']]) {
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
        q.forEach(([x, y], i) => { const j = i < q.length - 1 ? (Math.random() - 0.5) * 8 * u : 0; g[i ? 'lineTo' : 'moveTo'](x + j, y - 15 * u * P.s + j); }); g.stroke();
      }
      for (let i = 0; i < 3; i++) { const [x, y] = q[Math.floor(Math.random() * q.length)]; g.fillStyle = Math.random() < 0.5 ? '#fff' : '#7ad8ff'; g.fillRect(x + (Math.random() - 0.5) * 10 * u, y - (8 + Math.random() * 18) * u, 2 * u, 2 * u); }
    }
    if (k === 'arc' && pts.length) {
      const q = pts.map(p => [sxy(p), p.t]).concat([[[X, Y], t]]);
      for (let b = 0; b < 6; b++) {
        g.strokeStyle = `hsl(${b * 55},90%,60%)`; g.lineWidth = 2.6 * u;
        for (let i = 1; i < q.length; i++) { g.globalAlpha = Math.max(0, 1 - (t - q[i][1]) / life) * 0.85; g.beginPath(); g.moveTo(q[i - 1][0][0], q[i - 1][0][1] - (6 + b * 2.4) * u); g.lineTo(q[i][0][0], q[i][0][1] - (6 + b * 2.4) * u); g.stroke(); }
      }
      g.globalAlpha = 1;
    }
    if (k === 'invis') {
      for (const p of pts) {   // impronte che sbiadiscono, una a destra e una a sinistra
        const [x, y] = sxy(p), side = p.n % 2 ? 1 : -1; g.globalAlpha = Math.max(0, 1 - (t - p.t) / life) * 0.5;
        g.fillStyle = '#3a2e44'; g.beginPath(); g.ellipse(x + side * 3.5 * u, y + side * 1.2 * u, 2.6 * u, 1.4 * u, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(x + side * 3.5 * u + 2.4 * u, y + side * 1.2 * u - 0.6 * u, 1.1 * u, 0.8 * u, 0, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    }
    let y0 = Y - P.sitK * TW, sx = P.s, sy = P.s, alpha = 1, tint = null;
    if (k === 'fly' || k === 'rimb') {   // ombra a terra (il personaggio e' staccato dal pavimento)
      const hop = k === 'rimb' ? Math.abs(Math.sin((t * 2.6 + P.id * 0.3) * Math.PI)) : 1;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(X, Y, (12 - hop * 3) * u * P.s, (5 - hop) * u * P.s, 0, 0, 7); g.fill();
      if (k === 'fly') y0 -= (P.lift + Math.sin(t * 2.6 + P.id) * 0.08) * TW;
      else { y0 -= hop * 0.5 * TW; if (hop < 0.18) { sx *= 1.18; sy *= 0.82; } else if (hop > 0.6) { sx *= 0.93; sy *= 1.08; } }
    }
    if (k === 'fly') {   // palloncino legato alla schiena
      const bx = X - f * 10 * u + Math.sin(t * 1.7 + P.id) * 2 * u, by = y0 - (cqTop(L) + 0.9) * TW;
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.8 * u; g.beginPath(); g.moveTo(X - f * 4 * u, y0 - 18 * u); g.quadraticCurveTo(bx + 4 * u, (by + y0) / 2, bx, by + 9 * u); g.stroke();
      g.fillStyle = '#ff5a8a'; g.beginPath(); g.ellipse(bx, by, 7 * u, 8.5 * u, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(bx - 2.5 * u, by - 3 * u, 1.8 * u, 2.6 * u, -0.4, 0, 7); g.fill();
      g.fillStyle = '#ff5a8a'; g.beginPath(); g.moveTo(bx - 2 * u, by + 9.5 * u); g.lineTo(bx + 2 * u, by + 9.5 * u); g.lineTo(bx, by + 7.5 * u); g.fill();
    }
    if (k === 'forza') {   // alone rosso che pulsa
      const pz = 0.5 + 0.5 * Math.sin(t * 6);
      g.fillStyle = `rgba(255,70,50,${0.12 + 0.12 * pz})`; g.beginPath(); g.ellipse(X, y0 - 20 * u * P.s, (17 + 3 * pz) * u * P.s, (27 + 3 * pz) * u * P.s, 0, 0, 7); g.fill();
    }
    if (k === 'invis') alpha = P.me ? 0.32 : 0;
    if (k === 'zomb' || k === 'verde') tint = Object.assign({ s: P.id }, ZT);
    if (k === 'arc') tint = { c: `hsl(${(t * 140 + P.id * 47) % 360},90%,55%)`, a: 0.5, rot: 0 };
    if (alpha > 0) {
      g.save(); g.translate(X, y0); g.scale(sx, sy); g.globalAlpha = alpha;
      if (tint) cqPlayerTint(g, 0, 0, TW, L, w, f, tint); else cqPlayer(g, 0, 0, TW, L, w, f, !!P.sitK);
      g.globalAlpha = 1;
      if (P.sw != null && P.sw < 0.45) cqSlapHand(g, 0, 0, TW, f, P.sw);
      g.restore();
    }
    const top = y0 - cqTop(L) * TW * sy;
    if (k === 'invis') {   // luccichio: stelline che compaiono e spariscono attorno a dove sta
      for (let i = 0; i < 4; i++) {
        const ph = t * 2.2 + i * 0.25, n = Math.floor(ph), fr = ph - n, h = Math.sin(n * 91.7 + i * 13.1 + P.id) * 43758.5, r = h - Math.floor(h), r2 = (h * 7.3) - Math.floor(h * 7.3);
        const x = X + (r - 0.5) * 22 * u, y = Y - (4 + r2 * 34) * u, s = Math.sin(fr * Math.PI) * 3.2 * u;
        g.fillStyle = 'rgba(235,245,255,.9)'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.3, y - s * 0.3); g.lineTo(x + s, y); g.lineTo(x + s * 0.3, y + s * 0.3); g.lineTo(x, y + s); g.lineTo(x - s * 0.3, y + s * 0.3); g.lineTo(x - s, y); g.lineTo(x - s * 0.3, y - s * 0.3); g.fill();
      }
    }
    if (k === 'zomb' || k === 'verde') {   // come in Infezione: mani avanti (solo la Zombina) e bollicine verdi della puzza
      if (k === 'zomb') { g.fillStyle = '#6f9a3e'; for (const dy of [-21, -15]) { g.beginPath(); g.ellipse(X + f * 15 * u, y0 + dy * u, 5 * u, 2.6 * u, 0, 0, 7); g.fill(); } }
      for (let i = 0; i < (k === 'zomb' ? 6 : 3); i++) {
        const p = (t / 1.6 + i / 6 + P.id * 0.37) % 1, bx = X + ((i % 3) - 1) * 6 * u + Math.sin(p * 7 + i * 2) * 4 * u, by = top + 0.15 * TW - p * 26 * u, r = (1.4 + p * 2.6) * u;
        g.globalAlpha = Math.min(1, (1 - p) * 1.6) * 0.85; g.fillStyle = 'rgba(140,210,70,.55)'; g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill();
        g.strokeStyle = '#a8e060'; g.lineWidth = 0.9 * u; g.stroke();
      }
      g.globalAlpha = 1;
    }
    if (k === 'matta') {   // spirale che gira sopra la testa e uccellini
      const cx = X, cy = top - 0.25 * TW, a0 = t * 5;
      g.strokeStyle = '#b07af0'; g.lineWidth = 1.8 * u; g.beginPath();
      for (let i = 0; i <= 40; i++) { const a = a0 + i * 0.4, r = i * 0.22 * u; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r * 0.6); } g.stroke();
      for (let i = 0; i < 3; i++) { const a = -t * 3 + i * 2.1; g.fillStyle = '#fff3a0'; g.font = `${Math.round(7 * u)}px system-ui`; g.textAlign = 'center'; g.fillText('★', cx + Math.cos(a) * 14 * u, cy + Math.sin(a) * 5 * u + 2 * u); }
    }
  }
  return { K, IDS, buy, apply, dir, spd, moved, pow, pub, tick, look, off, kindOf, S };
})();
