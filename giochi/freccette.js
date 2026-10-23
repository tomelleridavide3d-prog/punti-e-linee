// ==== FRECCETTE NELLA HALL (23-10-2026, piano in CLAUDE.md "PIANO PASSATEMPI DELLA HALL") ====
// Bersaglio dipinto sul muro dell'angolo giochi (giochi/lib/pixel.js), linea di tiro a terra (y 5, x R-4..R-2): li' compare "🎯 Freccette".
// Visuale a tutto schermo sul bersaglio: tocchi dove vuoi mirare (il mirino sta un po' sopra il dito), tiri il dito indietro e lasci.
// Il mirino trema come una mano vera (piu' aspetti, piu' trema); la forza giusta e' la fascia verde: troppo poca = freccia bassa, troppa = alta.
// Partita = 3 GIRI da 3 freccette a testa, vince chi fa PIU' PUNTI. Contro il computer (Il Conte) o un amico del party, a turno; gli altri guardano.
// Online come il tavolo della Briscola: chi sfida fa da banco e scrive lo stato in cq/<set>/da/<sid del banco>/s {m: JSON, ts}; l'avversario manda i
// tiri in .../a (il suo telefono calcola dove cade la freccia, il banco conta i punti); chi guarda si segna in .../w. Lavagna dei record: dr/<nome> {n, p, t}
// (il miglior totale di ognuno, si leggono i 5 migliori). Ganci: DA.tick (cqHallTick), DA.sign (cqDraw, sopra la lavagna), DA.busy (cqHallReady).
window.DA = (() => {
  const SEQ = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const RB = 0.05, RO = 0.11, T0 = 0.582, T1 = 0.629, D0 = 0.953, AI_NAME = 'Il Conte', ROUNDS = 3, PER = 3;
  const OK0 = 85, OK1 = 135;   // forza giusta (pixel di dito tirato indietro)
  let T = null;   // partita aperta: { key, host, me (0/1, -1 = guardo), S, root, cv, ... }
  const L = { un: [], N: null, tabs: {}, ms: {}, asked: {}, acc: {}, inv: null, rec: [], recUn: null, uiT: 0 };
  const now = () => performance.now() / 1000;
  const myName = () => String(store.settings.myName || 'Io').slice(0, 14);

  // ---- punti: x, y in unita' del bersaglio (1 = bordo esterno dei doppi), y verso il basso ----
  function score(x, y) {
    const r = Math.hypot(x, y);
    if (r <= RB) return [50, 'BULL'];
    if (r <= RO) return [25, '25'];
    if (r > 1) return [0, 'Fuori'];
    const a = (Math.atan2(x, -y) * 180 / Math.PI + 369) % 360, n = SEQ[Math.floor(a / 18)];
    if (r >= T0 && r <= T1) return [n * 3, 'T' + n];
    if (r >= D0) return [n * 2, 'D' + n];
    return [n, '' + n];
  }
  const tot = (S, i) => S.th[i].reduce((a, b) => a + b, 0);

  // ---- motore della partita (lo fa girare il banco, o il mio telefono contro il computer) ----
  function newMatch(S0) {
    const f = S0.f == null ? 0 : 1 - S0.f;
    return Object.assign({}, S0, { ph: 'play', th: [[], []], d: [], r: 0, tu: f, f, k: 0, wait: 0, last: null, lid: (S0.lid || 0) + 1, g: (S0.g || 0) + 1, rv: [0, 0], best: null });
  }
  function hostAct(seat, a) {
    const S = T.S;
    if (a.k === 'rv') { if (S.ph !== 'end') return; S.rv[seat] = 1; if (S.ai >= 0) S.rv[S.ai] = 1; if (S.rv[0] && S.rv[1]) { T.S = newMatch(S); commit(); } else commit(); return; }
    if (a.k !== 't' || S.ph !== 'play' || S.wait || seat !== S.tu || S.k >= PER) return;
    const x = Math.max(-1.6, Math.min(1.6, +a.x || 0)), y = Math.max(-1.6, Math.min(1.6, +a.y || 0)), [p, lab] = score(x, y);
    S.th[seat].push(p); S.d.push([Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000, seat]); S.k++;
    S.last = { x, y, p, lab, by: seat, id: ++S.lid };
    if (S.k >= PER) {   // fine delle tre freccette: si ritirano e tocca all'altro
      S.wait = 1; const tok = T;
      clearTimeout(T.nt); T.nt = setTimeout(() => {
        if (T !== tok) return; const S2 = T.S; S2.wait = 0; S2.k = 0; S2.d = [];
        if (S2.tu === S2.f) S2.tu = 1 - S2.f; else { S2.tu = S2.f; S2.r++; }
        if (S2.r >= ROUNDS) { S2.ph = 'end'; const a0 = tot(S2, 0), a1 = tot(S2, 1); S2.win = a0 === a1 ? -1 : a0 > a1 ? 0 : 1; }
        commit();
      }, 1700);
    }
    commit();
  }
  function commit() {
    T.S.v = (T.S.v || 0) + 1; publish(); render();
    const S = T.S, tok = T;
    if (S.ph === 'play' && S.ai >= 0 && S.tu === S.ai && !S.wait && S.k < PER) {   // tira il computer
      clearTimeout(T.at);
      T.at = setTimeout(() => { if (T !== tok || T.S.tu !== T.S.ai || T.S.wait) return; const [x, y] = aiThrow(); hostAct(T.S.ai, { k: 't', x, y }); }, 1200 + Math.random() * 600);
    }
  }
  // il Conte: mira al triplo 20 (a volte al centro) e sbaglia come una persona (errore a campana)
  function aiThrow() {
    const g = () => { let s = 0; for (let i = 0; i < 4; i++) s += Math.random(); return (s - 2) / 0.58; };
    const bull = Math.random() < 0.2, tx = 0, ty = bull ? 0 : -0.605, e = 0.085;
    return [tx + g() * e, ty + g() * e];
  }
  function publish() { const N = cq.net; if (N && T && T.key) cqNetPut(`cq/${N.code}/da/${T.key}/s`, { m: JSON.stringify(T.S), ts: Date.now() }); }
  function send(a) { const N = cq.net; if (N && T && T.key) N.F.push(cqNetRef(`cq/${N.code}/da/${T.key}/a`), { s: N.sid, m: JSON.stringify(a) }).catch(() => {}); }
  function act(a) { if (!T) return; if (T.host) hostAct(T.me, a); else send(a); }

  // ---- avvio: computer, sfida, guardare ----
  function startAI() {
    close(); const N = cq.net;
    T = { key: N ? N.sid : null, host: true, me: 0, S: { p: [N ? N.sid : null, null], n: [myName(), AI_NAME], ai: 1, v: 0 } };
    if (N) N.F.onDisconnect(cqNetRef(`cq/${N.code}/da/${N.sid}`)).remove();
    T.S = newMatch(T.S); open(); commit();
  }
  function challenge(c) {
    const N = cq.net; if (!N) return;
    close();
    T = { key: N.sid, host: true, me: 0, S: { ph: 'inv', p: [N.sid, c.sid], n: [myName(), String(c.name || 'Amico').slice(0, 14)], ai: -1, v: 1, ts0: Date.now() } };
    N.F.onDisconnect(cqNetRef(`cq/${N.code}/da/${N.sid}`)).remove();
    publish();
    modal(`<h2>🎯 Sfida a freccette</h2><p>Aspetto la risposta di <b>${esc(T.S.n[1])}</b>…</p><button type="button" data-k="x">Annulla</button>`, k => { if (k === 'x' && T && T.S.ph === 'inv') close(); });
    const tok = T;
    T.it = setTimeout(() => { if (T === tok && T.S.ph === 'inv') { modalClose(); close(); cqToast('🎯 <b>' + esc(tok.S.n[1]) + '</b> non ha risposto alla sfida.'); } }, 30000);
  }
  function hostMsg(from, a) {
    if (!T || !T.host || !T.key) return;
    const S = T.S, seat = S.p.indexOf(from); if (seat < 0) return;
    if (S.ph === 'inv') {
      if (a.k === 'ok') { clearTimeout(T.it); modalClose(); T.S = newMatch(S); open(); commit(); }
      else if (a.k === 'no') { const n = S.n[1]; modalClose(); close(); cqToast('🎯 <b>' + esc(n) + '</b> ha detto di no. Sarà per un\'altra volta!'); }
      return;
    }
    if (a.k === 'bye') { const n = S.n[seat]; close(); cqToast('🎯 <b>' + esc(n) + '</b> ha lasciato le freccette.'); return; }
    hostAct(seat, a);
  }
  function watch(key) {
    const N = cq.net, t = L.tabs[key]; if (!N || !t || !t.s) return;
    close();
    T = { key, host: false, me: -1, S: JSON.parse(t.s.m) };
    N.F.set(cqNetRef(`cq/${N.code}/da/${key}/w/${N.sid}`), 1).catch(() => {});
    N.F.onDisconnect(cqNetRef(`cq/${N.code}/da/${key}/w/${N.sid}`)).remove();
    open();
  }
  function close() {
    if (!T) return;
    clearTimeout(T.at); clearTimeout(T.it); clearTimeout(T.nt); cancelAnimationFrame(T.raf);
    if (T.root) T.root.remove();
    const N = cq.net;
    if (N && T.key) {
      if (T.host) N.F.remove(cqNetRef(`cq/${N.code}/da/${T.key}`)).catch(() => {});
      else if (T.me < 0) N.F.remove(cqNetRef(`cq/${N.code}/da/${T.key}/w/${N.sid}`)).catch(() => {});
      else send({ k: 'bye' });
    }
    T = null;
  }

  // ---- rete del party ----
  function resub() {
    for (const u of L.un) try { u(); } catch {}
    L.un = []; L.N = cq.net; L.tabs = {}; L.ms = {};
    const N = cq.net; if (!N) return;
    L.un.push(N.F.onValue(cqNetRef(`cq/${N.code}/da`), s => { if (cq.net === N) { L.tabs = s.val() || {}; onTabs(); } }));
    L.un.push(N.F.onChildAdded(cqNetRef(`cq/${N.code}/da/${N.sid}/a`), sn => { const v = sn.val(); N.F.remove(sn.ref).catch(() => {}); try { hostMsg(v.s, JSON.parse(v.m)); } catch {} }));
  }
  const parse = (key, t) => { if (!t || !t.s || typeof t.s.m !== 'string') return null; const c = L.ms[key]; if (c && c.m === t.s.m) return c.S; try { const S = JSON.parse(t.s.m); L.ms[key] = { m: t.s.m, S }; return S; } catch { return null; } };
  function games() {   // partite in corso nel party: [{key, S}]
    const out = [], n = Date.now();
    for (const [k, t] of Object.entries(L.tabs)) { const S = parse(k, t); if (S && S.ph !== 'inv' && n - (t.s.ts || 0) < 15 * 60000) out.push({ key: k, S }); }
    return out;
  }
  function onTabs() {
    const N = cq.net; if (!N) return;
    for (const [key, t] of Object.entries(L.tabs)) {
      const S = parse(key, t); if (!S || !S.p) continue;
      if (S.ph === 'inv' && S.p[1] === N.sid && !L.asked[key + ':' + S.ts0] && Date.now() - (t.s.ts || 0) < 30000) {
        L.asked[key + ':' + S.ts0] = 1; L.inv = key;
        beep(880, 0.08, 0.04); beep(1175, 0.12, 0.04, 0.1);
        if (typeof window.daAutoOk === 'function' && window.daAutoOk(S.n[0])) { L.acc[key] = S.ts0; N.F.push(cqNetRef(`cq/${N.code}/da/${key}/a`), { s: N.sid, m: JSON.stringify({ k: 'ok' }) }).catch(() => {}); continue; }
        modal(`<h2>🎯 Sfida a freccette!</h2><p><b>${esc(S.n[0])}</b> ti sfida a freccette: 3 giri da 3 freccette, vince chi fa più punti.</p><button class="pr" type="button" data-k="ok">✅ Accetta</button><button type="button" data-k="no">❌ No</button>`, k => {
          L.inv = null; L.acc[key] = k === 'ok' ? S.ts0 : 0;
          N.F.push(cqNetRef(`cq/${N.code}/da/${key}/a`), { s: N.sid, m: JSON.stringify({ k }) }).catch(() => {});
        });
      }
      if (S.ph === 'play' && S.p[1] === N.sid && L.acc[key] && L.acc[key] === S.ts0 && (!T || T.key !== key)) { L.acc[key] = 0; close(); T = { key, host: false, me: 1, S }; open(); }
    }
    if (L.inv && (!L.tabs[L.inv] || (parse(L.inv, L.tabs[L.inv]) || {}).ph !== 'inv')) { L.inv = null; modalClose(); }
    if (T && T.key && !T.host) {
      const S = parse(T.key, L.tabs[T.key]);
      if (!S) { const n = T.S && T.S.n ? T.S.n[0] : ''; close(); if (n) cqToast('🎯 La partita di <b>' + esc(n) + '</b> è finita.'); return; }
      if (JSON.stringify(S) !== JSON.stringify(T.S)) { T.S = JSON.parse(JSON.stringify(S)); render(); }
    }
    if (T && T.key) { const t = L.tabs[T.key]; T.watch = t && t.w ? Object.keys(t.w).length : 0; }
  }

  // ---- lavagna dei record (per tutti, non solo il party) ----
  function recSub() {
    if (L.recUn || typeof hub === 'undefined' || !hub.fb || !hub.fb.query) return;
    try {
      const F = hub.fb, q = F.query(F.ref(F.db, 'dr'), F.orderByChild('p'), F.limitToLast(5));
      L.recUn = F.onValue(q, s => { const a = []; s.forEach(c => { const v = c.val(); if (v && typeof v.n === 'string') a.push({ n: v.n.slice(0, 14), p: +v.p || 0 }); }); L.rec = a.sort((x, y) => y.p - x.p); }, () => {});
    } catch { L.recUn = () => {}; }
  }
  function recSave(p) {
    const best = store.settings.daBest || 0, k = nameKey(myName());
    if (p > best) { store.settings.daBest = p; saveStore(); }
    if (typeof hub === 'undefined' || !hub.fb || !hub.fb.get || k === 'x' || /^zz/i.test(myName())) return p > best;   // zz...: nomi delle prove automatiche, niente lavagna vera
    const F = hub.fb, r = F.ref(F.db, 'dr/' + k);
    F.get(r).then(s => { const v = s.val(); if (!v || p > (+v.p || 0)) F.set(r, { n: myName(), p, t: Date.now() }).catch(() => {}); }).catch(() => {});
    return p > best;
  }

  // ---- hall: pulsante sulla linea di tiro, cartello sopra la lavagna ----
  const R = () => CQ_W - 2;
  const atLine = () => cq.y > 4.55 && cq.y < 6.1 && cq.x > R() - 4.1 && cq.x < R() - 0.9;
  function tick(G, dt) {
    if (L.N !== cq.net) resub();
    recSub();
    if ((L.uiT -= dt) > 0) return; L.uiT = 0.15;
    const box = document.getElementById('ciack'); if (!box) return;
    let b = document.getElementById('daHallB');
    if (!b) { b = document.createElement('button'); b.id = 'daHallB'; b.className = 'btn'; b.type = 'button'; b.hidden = true; b.textContent = '🎯 Freccette'; b.onclick = pick; box.appendChild(b); }
    const on = !!(G && G.hall && G.me.alive && cqHallFree() && cq.sit == null && atLine() && !T && !document.getElementById('daModal'));
    if (b.hidden === on) b.hidden = !on;
  }
  function sign(g, sx, sy, TW) {
    if (Math.hypot(cq.x - (R() - 1), cq.y - 2) > 6.5) return;
    const top = L.rec[0], X = sx(R() - 1, 1.05), Y = sy(R() - 1, 1.05) - TW * 2.95;
    const t = top ? '🏆 ' + top.n + ' · ' + top.p : '🏆 Lavagna dei record: vuota!';
    g.font = '700 11px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(t).width + 14; g.fillStyle = 'rgba(20,22,28,.85)'; cqRR(g, X - w / 2, Y - 10, w, 20, 7); g.fill();
    g.strokeStyle = '#e0b84a'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#fff3c4'; g.fillText(t, X, Y + 0.5);
  }
  const busy = () => !!(T && T.me >= 0 && T.S && T.S.ph === 'play');
  function recHtml() {
    if (!L.rec.length) return '<p style="opacity:.75">La lavagna è ancora vuota: il primo record può essere il tuo!</p>';
    return '<div class="daRec">' + L.rec.map((r, i) => `<div><span>${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${esc(r.n)}</span><b>${r.p}</b></div>`).join('') + '</div>';
  }
  function pick() {
    const G = cq.g; if (!G || !G.hall) return;
    const gs = games(), busyS = new Set(); gs.forEach(x => x.S.p.forEach(p => p && busyS.add(p)));
    const fr = cq.net ? G.chars.filter(c => c.remote && c.alive && !busyS.has(c.sid)) : [];
    const list = fr.map((c, i) => `<button type="button" data-k="f${i}" class="bcPick">⚔️ Sfida ${esc(c.name)}</button>`).join('');
    const wl = gs.map((x, i) => `<button type="button" data-k="w${i}" class="bcPick">👀 Guarda ${esc(x.S.n[0])} contro ${esc(x.S.n[1])}</button>`).join('');
    modal(`<h2>🎯 Freccette</h2><p>3 giri da 3 freccette: vince chi fa più punti.</p>${list}<button type="button" data-k="ai" class="bcPick">🎩 ${AI_NAME} (computer)</button>${wl}<h3>🏆 Lavagna dei record</h3>${recHtml()}<button type="button" data-k="x">Annulla</button>`, k => {
      if (k === 'ai') startAI();
      else if (k[0] === 'f') { const c = fr[+k.slice(1)]; if (c) challenge(c); }
      else if (k[0] === 'w') { const x = gs[+k.slice(1)]; if (x) watch(x.key); }
    });
  }

  // ---- finestrella sopra la hall ----
  function modal(html, then) {
    modalClose();
    const m = document.createElement('div'); m.id = 'daModal'; m.innerHTML = `<div class="daBox">${html}</div>`;
    document.body.appendChild(m);
    m.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { modalClose(); then && then(b.dataset.k); }; });
    return m;
  }
  function modalClose() { const m = document.getElementById('daModal'); if (m) m.remove(); }

  // ---- visuale a tutto schermo ----
  const css = document.createElement('style');
  css.textContent = `
#daHallB{position:absolute;right:18px;bottom:244px;font-size:16px;font-weight:700;padding:11px 15px;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.35);background:linear-gradient(#3e8a4a,#235a2c);color:#fff;border:2px solid #e0b84a}
#daModal{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(10,8,16,.55)}
#daModal .daBox{background:#2a1e18;color:#f4ead2;border:3px solid #c99a44;border-radius:16px;padding:16px;width:min(340px,90vw);max-height:86vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.6);font-family:system-ui,sans-serif}
#daModal h2{margin:0 0 6px;font-size:20px}#daModal h3{margin:12px 0 4px;font-size:15px}#daModal p{margin:4px 0 10px;font-size:14px}
#daModal button{display:block;width:100%;margin:6px 0;padding:10px;border-radius:10px;border:2px solid #6a4a2a;background:#4a3020;color:#fff;font-weight:700;font-size:15px}
#daModal button.pr{background:#3e8a4a;border-color:#e0b84a}
#daModal .daRec div{display:flex;justify-content:space-between;padding:4px 8px;background:#1e2a24;border-radius:6px;margin:3px 0;font-family:'Comic Sans MS',system-ui;color:#ece8d4}
#daRoot{position:fixed;inset:0;z-index:55;background:radial-gradient(ellipse at 50% 38%,#2c5658 0%,#173032 60%,#0c1a1c 100%);touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,sans-serif}
#daRoot canvas{position:absolute;inset:0;width:100%;height:100%}
#daTop{position:absolute;left:8px;right:8px;top:8px;display:flex;gap:6px;align-items:stretch;pointer-events:none}
#daTop .pl{flex:1;background:rgba(20,16,14,.82);border:2px solid #6a4a2a;border-radius:12px;padding:5px 8px;color:#f4ead2;font-size:13px;line-height:1.25}
#daTop .pl.on{border-color:#e0b84a;box-shadow:0 0 12px rgba(224,184,74,.6)}
#daTop .pl b{font-size:22px;display:block}#daTop .pl small{opacity:.8;letter-spacing:1px}
#daTop .mid{background:rgba(20,16,14,.82);border:2px solid #6a4a2a;border-radius:12px;color:#e0b84a;font-weight:800;padding:5px 8px;text-align:center;font-size:12px;min-width:56px}
#daX{position:absolute;right:10px;bottom:12px;background:rgba(20,16,14,.85);color:#fff;border:2px solid #6a4a2a;border-radius:12px;padding:8px 12px;font-weight:700;font-size:14px}
#daHint{position:absolute;left:10px;right:110px;bottom:12px;color:#f4ead2;font-size:14px;font-weight:600;text-shadow:0 1px 4px #000;pointer-events:none}
#daEnd{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#2a1e18;color:#f4ead2;border:3px solid #c99a44;border-radius:16px;padding:18px;width:min(320px,88vw);text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.7)}
#daEnd h2{margin:0 0 8px;font-size:24px}#daEnd button{display:block;width:100%;margin:8px 0 0;padding:11px;border-radius:10px;border:2px solid #e0b84a;background:#3e8a4a;color:#fff;font-weight:800;font-size:16px}#daEnd button.no{background:#4a3020;border-color:#6a4a2a}`;
  document.head.appendChild(css);

  function open() {
    if (T.root) T.root.remove();
    const r = document.createElement('div'); r.id = 'daRoot';
    r.innerHTML = `<canvas></canvas><div id="daTop"></div><div id="daHint"></div><button id="daX" type="button">✕ Esci</button>`;
    document.body.appendChild(r);
    T.root = r; T.cv = r.querySelector('canvas'); T.fx = []; T.anim = null; T.aim = null; T.seen = T.S.last ? T.S.last.id : 0;
    r.querySelector('#daX').onclick = () => { const S = T && T.S; if (S && S.ph === 'play' && T.me >= 0 && !confirm('Lasci la partita a metà?')) return; close(); };
    const cv = T.cv;
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { if (T) { T.aim = null; draw(); } });
    T.ro = () => { if (T && T.root === r) { size(); draw(); } }; window.addEventListener('resize', T.ro);
    size(); render();
  }
  function size() {
    const cv = T.cv, dpr = Math.min(window.devicePixelRatio || 1, 2.5), W = cv.clientWidth, H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); T.W = W; T.H = H; T.dpr = dpr;
    T.R = Math.min(W * 0.345, H * 0.27); T.cx = W / 2; T.cy = Math.max(96 + T.R * 1.45, H * 0.44);
    T.board = boardImg(T.R, dpr);
  }
  // il bersaglio disegnato una volta (sughero, settori, fili, numeri) e incollato a ogni fotogramma
  function boardImg(Rp, dpr) {
    const S = Math.ceil(Rp * 2.9), c = document.createElement('canvas'); c.width = Math.round(S * dpr); c.height = Math.round(S * dpr);
    const g = c.getContext('2d'); g.scale(dpr, dpr); const o = S / 2;
    // mobiletto di legno con le ante aperte dietro
    g.fillStyle = '#4a2818'; g.beginPath(); g.arc(o, o, Rp * 1.42, 0, 7); g.fill();
    g.fillStyle = '#2a1810'; g.beginPath(); g.arc(o, o, Rp * 1.36, 0, 7); g.fill();
    g.fillStyle = '#1a1414'; g.beginPath(); g.arc(o, o, Rp * 1.24, 0, 7); g.fill();
    const ring = (r0, r1, a0, a1, col) => { g.fillStyle = col; g.beginPath(); g.arc(o, o, r1, a0, a1); g.arc(o, o, r0, a1, a0, true); g.closePath(); g.fill(); };
    for (let i = 0; i < 20; i++) {
      const a0 = (-90 - 9 + i * 18) * Math.PI / 180, a1 = a0 + Math.PI / 10, dark = i % 2 === 0;
      ring(RO * Rp, T0 * Rp, a0, a1, dark ? '#1e1a18' : '#efe4c4'); ring(T1 * Rp, D0 * Rp, a0, a1, dark ? '#1e1a18' : '#efe4c4');
      ring(T0 * Rp, T1 * Rp, a0, a1, dark ? '#c8303a' : '#2e8a44'); ring(D0 * Rp, Rp, a0, a1, dark ? '#c8303a' : '#2e8a44');
      const am = a0 + Math.PI / 20; g.fillStyle = '#f4f0e0'; g.font = `800 ${Math.round(Rp * 0.13)}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(SEQ[i], o + Math.cos(am) * Rp * 1.12, o + Math.sin(am) * Rp * 1.12);
    }
    g.fillStyle = '#2e8a44'; g.beginPath(); g.arc(o, o, RO * Rp, 0, 7); g.fill();
    g.fillStyle = '#c8303a'; g.beginPath(); g.arc(o, o, RB * Rp, 0, 7); g.fill();
    g.strokeStyle = 'rgba(210,214,222,.75)'; g.lineWidth = Math.max(0.6, Rp / 260);   // fili d'acciaio
    for (const r of [RB, RO, T0, T1, D0, 1]) { g.beginPath(); g.arc(o, o, r * Rp, 0, 7); g.stroke(); }
    for (let i = 0; i < 20; i++) { const a = (-90 - 9 + i * 18) * Math.PI / 180; g.beginPath(); g.moveTo(o + Math.cos(a) * RO * Rp, o + Math.sin(a) * RO * Rp); g.lineTo(o + Math.cos(a) * Rp, o + Math.sin(a) * Rp); g.stroke(); }
    // un po' di trama del sisal (puntini) e la luce del faretto dall'alto
    for (let i = 0; i < 900; i++) { const a = Math.random() * 7, r = Math.sqrt(Math.random()) * Rp; g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)'; g.fillRect(o + Math.cos(a) * r, o + Math.sin(a) * r, 1, 1); }
    const lg = g.createRadialGradient(o, o - Rp * 0.9, Rp * 0.1, o, o, Rp * 1.5); lg.addColorStop(0, 'rgba(255,230,180,.18)'); lg.addColorStop(1, 'rgba(0,0,0,.25)');
    g.fillStyle = lg; g.beginPath(); g.arc(o, o, Rp * 1.42, 0, 7); g.fill();
    return { c, S };
  }
  const toB = (px, py) => [(px - T.cx) / T.R, (py - T.cy) / T.R];
  const toS = (x, y) => [T.cx + x * T.R, T.cy + y * T.R];
  // mano che trema: piccola all'inizio, cresce se si aspetta troppo
  function trem(t, hold) {
    const a = 0.045 + Math.min(0.17, Math.max(0, hold - 0.9) * 0.08);
    return [a * (0.55 * Math.sin(t * 7.3) + 0.3 * Math.sin(t * 12.9 + 1.3) + 0.6 * Math.sin(t * 1.7 + 0.4)), a * (0.5 * Math.sin(t * 6.1 + 2) + 0.3 * Math.sin(t * 13.7) + 0.5 * Math.sin(t * 2.3 + 1)) + 0.012 * Math.sin(t * 2.2)];
  }
  const myTurn = () => T && T.S.ph === 'play' && T.me >= 0 && T.S.tu === T.me && !T.S.wait && T.S.k < PER && !T.anim && !T.pend;
  function down(e) {
    if (!myTurn()) return;
    e.preventDefault(); T.cv.setPointerCapture(e.pointerId);
    const [x, y] = toB(e.offsetX, e.offsetY - 70);
    T.aim = { x: Math.max(-1.35, Math.min(1.35, x)), y: Math.max(-1.35, Math.min(1.35, y)), y0: e.offsetY, pull: 0, t0: now() };
    loop();
  }
  function move(e) { if (!T || !T.aim) return; T.aim.pull = Math.max(0, e.offsetY - T.aim.y0); }
  function up() {
    if (!T || !T.aim) return;
    const A = T.aim; T.aim = null;
    if (A.pull < 25) { hint('Tira il dito <b>indietro</b> (verso il basso) e poi lascialo!'); draw(); return; }
    const t = now(), [jx, jy] = trem(t, t - A.t0), p = A.pull;
    let dy = 0; if (p > OK1) dy = -Math.min(0.6, (p - OK1) / 110 * 0.4); else if (p < OK0) dy = Math.min(0.75, (OK0 - p) / OK0 * 0.55);
    const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.035;
    const x = A.x + jx + g(), y = A.y + jy + dy + g();
    T.pend = 1; fly(x, y, T.me, () => { T.pend = 0; });   // la mia freccia parte subito; i punti li conta il banco
    T.mine = true; act({ k: 't', x, y });
  }
  // volo della freccia: dal basso al bersaglio con un arco
  function fly(x, y, by, done) {
    const slow = Math.hypot(x, y) <= RO;   // verso il centro: rallentatore
    T.anim = { x, y, by, t0: now(), d: slow ? 0.62 : 0.34, done };
    whoosh(); loop();
  }
  function loop() {
    if (!T) return; cancelAnimationFrame(T.raf);
    const step = () => {
      if (!T) return; draw();
      if (T.anim && now() - T.anim.t0 >= T.anim.d) { const a = T.anim; T.anim = null; land(a); if (a.done) a.done(); }
      const live = T.aim || T.anim || T.fx.some(f => now() - f.t0 < f.d) || (T.shake && now() - T.shake < 0.25);
      if (live) T.raf = requestAnimationFrame(step); else draw();
    };
    T.raf = requestAnimationFrame(step);
  }
  function land(a) {
    const [p, lab] = score(a.x, a.y);
    T.shake = now();
    thud(0.9, p ? 260 : 120); beep(p ? 180 : 110, 0.05, 0.05, 0, 'square');
    if (lab === 'BULL') { [0, 4, 7, 12, 16].forEach((n, i) => beep(523 * Math.pow(2, n / 12), 0.2, 0.05, 0.05 + i * 0.07, 'triangle')); }
    else if (lab[0] === 'T') { [0, 7, 12].forEach((n, i) => beep(660 * Math.pow(2, n / 12), 0.14, 0.04, 0.05 + i * 0.07, 'triangle')); }
    else if (!p) beep(150, 0.25, 0.04, 0.05, 'sawtooth');
    const big = lab === 'BULL' || lab[0] === 'T' || p >= 40;
    T.fx.push({ x: a.x, y: a.y, t0: now(), d: big ? 1.4 : 1, txt: lab === 'Fuori' ? 'Fuori!' : lab === 'BULL' ? '🎯 BULL! 50' : lab === '25' ? 'Centro! 25' : lab[0] === 'T' ? 'TRIPLO ' + lab.slice(1) + ' · ' + p : lab[0] === 'D' ? 'Doppio ' + lab.slice(1) + ' · ' + p : '' + p, big });
    loop();
  }
  const whoosh = () => { beep(900, 0.06, 0.02, 0, 'sine'); beep(700, 0.08, 0.02, 0.04, 'sine'); };
  function hint(h) { const e = T && T.root && T.root.querySelector('#daHint'); if (e) e.innerHTML = h; }

  // stato nuovo (mio o arrivato dal banco): scritte e, se c'e' un tiro nuovo di un altro, la freccia che vola
  function render() {
    if (!T || !T.root) return;
    const S = T.S, l = S.last;
    if (l && l.id !== T.seen) {
      T.seen = l.id;
      if (!(T.mine && l.by === T.me)) fly(l.x, l.y, l.by);
      T.mine = false;
    }
    const top = T.root.querySelector('#daTop');
    const pl = i => { const on = S.ph === 'play' && S.tu === i; return `<div class="pl${on ? ' on' : ''}">${i === T.me ? '⭐ ' : ''}${esc(S.n[i] || '?')}<b>${S.th ? tot(S, i) : 0}</b><small>${on && !S.wait ? '➶ '.repeat(PER - S.k) : '&nbsp;'}</small></div>`; };
    top.innerHTML = pl(0) + `<div class="mid">GIRO<br><span style="font-size:20px">${Math.min(ROUNDS, (S.r || 0) + 1)}/${ROUNDS}</span>${T.watch ? '<br>👀 ' + T.watch : ''}</div>` + pl(1);
    const who = S.n[S.tu] || '';
    hint(S.ph !== 'play' ? '' : S.wait ? 'Si ritirano le freccette…' : myTurn() ? `Tocca a te! Freccia ${S.k + 1} di ${PER}: <b>tocca dove miri</b>, tira il dito indietro e lascia.` : T.me < 0 ? `👀 Stai guardando: tira <b>${esc(who)}</b>.` : `Tira <b>${esc(who)}</b>…`);
    endBox();
    draw();
  }
  function endBox() {
    const old = T.root.querySelector('#daEnd'), S = T.S;
    if (S.ph !== 'end') { if (old) old.remove(); return; }
    if (old && old.dataset.g == S.g + ':' + S.rv.join('')) return;
    if (old) old.remove();
    const a = tot(S, 0), b = tot(S, 1), me = T.me, mine = me >= 0 ? tot(S, me) : 0;
    let rec = '';
    if (me >= 0 && T.recG !== S.g) { T.recG = S.g; T.newRec = recSave(mine); if (S.win === me) { [0, 4, 7, 12].forEach((n, i) => beep(523 * Math.pow(2, n / 12), 0.2, 0.05, i * 0.1, 'triangle')); if (cq.g && cq.g.hall) cqCoins(1); } }
    if (me >= 0 && T.newRec) rec = `<p>🏆 Nuovo record personale: <b>${mine}</b>!</p>`;
    const title = S.win === -1 ? '🤝 Pareggio!' : me < 0 ? '🏆 Vince ' + esc(S.n[S.win]) + '!' : S.win === me ? '🏆 Hai vinto!' : '😅 Ha vinto ' + esc(S.n[S.win]);
    const e = document.createElement('div'); e.id = 'daEnd'; e.dataset.g = S.g + ':' + S.rv.join('');
    const waitRv = me >= 0 && S.rv[me] && !S.rv[1 - me];
    e.innerHTML = `<h2>${title}</h2><p>${esc(S.n[0])} <b>${a}</b> · ${esc(S.n[1])} <b>${b}</b></p>${me >= 0 && S.win === me ? '<p>+1 🪙 per la vittoria</p>' : ''}${rec}`
      + (me >= 0 ? `<button type="button" data-k="rv"${waitRv ? ' disabled' : ''}>${waitRv ? 'Aspetto ' + esc(S.n[1 - me]) + '…' : '🔁 Rivincita'}</button>` : '') + `<button type="button" class="no" data-k="x">Torna nella hall</button>`;
    e.querySelectorAll('button').forEach(bt => { bt.onclick = () => { if (bt.dataset.k === 'rv') act({ k: 'rv' }); else close(); }; });
    T.root.appendChild(e);
  }

  // ---- disegno della visuale ----
  function draw() {
    if (!T || !T.cv) return;
    const g = T.cv.getContext('2d'), t = now(), { W, H, dpr } = T;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const sk = T.shake && t - T.shake < 0.25 ? (1 - (t - T.shake) / 0.25) * 4 : 0, ox = (Math.random() - 0.5) * sk, oy = (Math.random() - 0.5) * sk;
    // carta da parati e alone del faretto
    g.fillStyle = 'rgba(255,220,160,.07)'; g.beginPath(); g.ellipse(T.cx, T.cy - T.R * 0.4, T.R * 2, T.R * 1.7, 0, 0, 7); g.fill();
    const B = T.board; g.drawImage(B.c, T.cx - B.S / 2 + ox, T.cy - B.S / 2 + oy, B.S, B.S);
    // freccette piantate in questo turno
    const S = T.S;
    for (const [x, y, s] of S.d || []) dart(g, ...toS(x, y).map((v, i) => v + (i ? oy : ox)), s, 1);
    // freccia in volo
    if (T.anim) {
      const a = T.anim, k = Math.min(1, (t - a.t0) / a.d), e = 1 - (1 - k) * (1 - k), [tx, ty] = toS(a.x, a.y), sx = W / 2 + (a.by === T.me ? 0 : (a.by ? 60 : -60)), sy = H + 40;
      const x = sx + (tx - sx) * e, y = sy + (ty - sy) * e - Math.sin(k * Math.PI) * T.R * 0.35;
      dart(g, x, y, a.by, 1 + (1 - k) * 2.2);
    }
    // scritte dei punti che salgono
    for (const f of T.fx) {
      const k = (t - f.t0) / f.d; if (k >= 1) continue;
      const [x, y] = toS(f.x, f.y), s = f.big ? 1 + 0.5 * Math.sin(Math.min(1, k * 4) * Math.PI / 2) : 1;
      g.save(); g.globalAlpha = Math.min(1, (1 - k) * 2.5); g.translate(x, y - 30 - k * 40); g.scale(s, s);
      g.font = `900 ${f.big ? 26 : 20}px system-ui,sans-serif`; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(f.txt, 0, 0);
      g.fillStyle = f.big ? '#ffe14a' : '#fff'; g.fillText(f.txt, 0, 0); g.restore();
    }
    T.fx = T.fx.filter(f => t - f.t0 < f.d);
    // mirino che trema e forza
    if (T.aim) {
      const A = T.aim, [jx, jy] = trem(t, t - A.t0), [x, y] = toS(A.x + jx, A.y + jy), p = A.pull, ok = p >= OK0 && p <= OK1;
      g.strokeStyle = ok ? '#7bff8a' : '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 11, 0, 7); g.stroke();
      g.beginPath(); for (const [a, b, c, d] of [[-18, 0, -6, 0], [6, 0, 18, 0], [0, -18, 0, -6], [0, 6, 0, 18]]) { g.moveTo(x + a, y + b); g.lineTo(x + c, y + d); } g.stroke();
      g.fillStyle = '#ff3a3a'; g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill();
      // barra della forza (fascia verde = giusta) e la freccia in mano tirata indietro
      const bx = W - 34, by0 = H * 0.55, bh = H * 0.32, sc = bh / 200;
      g.fillStyle = 'rgba(0,0,0,.55)'; cqRR(g, bx - 9, by0 - 6, 18, bh + 12, 9); g.fill();
      g.fillStyle = 'rgba(80,220,100,.55)'; g.fillRect(bx - 6, by0 + OK0 * sc, 12, (OK1 - OK0) * sc);
      g.fillStyle = ok ? '#7bff8a' : p > OK1 ? '#ff6a4a' : '#ffe14a'; g.fillRect(bx - 6, by0, 12, Math.min(200, p) * sc);
      g.fillStyle = '#fff'; g.font = '700 11px system-ui'; g.textAlign = 'center'; g.fillText('FORZA', bx, by0 - 12);
      dart(g, W / 2, H - 90 + Math.min(160, p) * 0.5, T.me, 2.4);
    }
  }
  // freccetta vista da dietro-davanti: punta piantata nel punto, asta e alette colorate (rosse il primo giocatore, blu il secondo)
  function dart(g, x, y, s, k) {
    const col = s === 0 ? '#e84a4a' : '#3a7ae8', col2 = s === 0 ? '#ffb0a0' : '#a8d0ff';
    g.save(); g.translate(x, y); g.scale(k, k);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(2, 2, 3, 1.6, 0, 0, 7); g.fill();
    g.strokeStyle = '#c8ccd4'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(5, -9); g.stroke();
    g.strokeStyle = '#2a2a30'; g.lineWidth = 3; g.beginPath(); g.moveTo(5, -9); g.lineTo(9, -16); g.stroke();
    g.fillStyle = col; g.beginPath(); g.moveTo(9, -16); g.lineTo(17, -20); g.lineTo(14, -26); g.closePath(); g.fill();
    g.fillStyle = col2; g.beginPath(); g.moveTo(9, -16); g.lineTo(6, -26); g.lineTo(12, -27); g.closePath(); g.fill();
    g.fillStyle = '#e8e8ec'; g.beginPath(); g.arc(0, 0, 1.3, 0, 7); g.fill();
    g.restore();
  }

  return { tick, sign, busy, pick, startAI, close, score, aiThrow, get T() { return T; }, L };
})();
