// ==== SCOPA AL TAVOLINO (23-10-2026, piano in CLAUDE.md "PIANO PASSATEMPI DELLA HALL", sessione 3) ====
// Sul tavolino del salotto insieme alla Briscola: "🃏 Carte" (giochi/briscola.js) chiede Briscola o Scopa; anche nei Giochi da tavola della reception.
// Carte napoletane di giochi/lib/carte.js (si caricano con bcLoad). Partita e rete col modulo comune giochi/lib/tavolo.js (id 'sc'): chi sfida fa da banco.
// Regole (2 giocatori): 3 carte a testa e 4 in tavola; si prende una carta di pari valore (ha la precedenza) o piu' carte che sommate fanno il valore;
// se una carta prende in piu' modi si sceglie con un tocco; tavola vuota = scopa (non all'ultima giocata). Finito il mazzo, le carte rimaste vanno a
// chi ha preso per ultimo. Conteggio a fine smazzata: carte (piu' di 20), denari (piu' di 5), settebello, primiera, scope. Si vince a 11 (pari: si continua).
window.SC = (() => {
  const val = c => +c.slice(1), su = c => c[0];
  const PRIM = [0, 16, 12, 13, 14, 15, 18, 21, 10, 10, 10];
  const SU = { d: '♦ denari', c: '♥ coppe', s: '♠ spade', b: '♣ bastoni' }, LB = ['', 'Asso', '2', '3', '4', '5', '6', '7', 'Fante', 'Cavallo', 'Re'];
  const nm = c => LB[val(c)] + ' di ' + { d: 'denari', c: 'coppe', s: 'spade', b: 'bastoni' }[su(c)];
  const short = c => (val(c) === 1 ? 'A' : val(c) <= 7 ? val(c) : ['F', 'C', 'R'][val(c) - 8]) + { d: '♦', c: '♥', s: '♠', b: '♣' }[su(c)];

  // ---- motore ----
  function deck() { const d = []; for (const s of 'dcsb') for (let r = 1; r <= 10; r++) d.push(s + r); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
  function deal(S) {
    let d; do { d = deck(); } while (d.slice(-10, -6).filter(c => val(c) === 10).length >= 3);   // 3 o 4 re in tavola: si rimescola
    S.d = d; S.h = [[], []]; S.pl = [[], []]; S.sc = [0, 0]; S.last = -1; S.tb = [];
    for (let i = 0; i < 3; i++) { S.h[1 - S.dl].push(S.d.pop()); S.h[S.dl].push(S.d.pop()); }
    for (let i = 0; i < 4; i++) S.tb.push(S.d.pop());
    S.tu = 1 - S.dl; S.mv = null; S.ok = [0, 0];
  }
  // modi di prendere con la carta c: prima le carte di pari valore (una alla volta), se non ce ne sono le somme
  function options(tb, c) {
    const v = val(c), same = tb.filter(x => val(x) === v);
    if (same.length) return same.map(x => [x]);
    const out = [], n = tb.length;
    for (let m = 1; m < (1 << n); m++) { let s = 0; const g = []; for (let i = 0; i < n; i++) if (m & (1 << i)) { s += val(tb[i]); g.push(tb[i]); } if (s === v && g.length > 1) out.push(g); }
    return out;
  }
  function newMatch(S0) {
    const f = S0.f == null ? 0 : 1 - S0.f;
    const S = { tot: [0, 0], dl: 1 - f, hand: 1, tl: null, win: null, why: '', mid: 0 };
    deal(S); return S;
  }
  function primiera(cards) { let t = 0; for (const s of 'dcsb') { const b = Math.max(0, ...cards.filter(c => su(c) === s).map(c => PRIM[val(c)])); if (!b) return 0; t += b; } return t; }
  function tally(S) {
    const P = S.pl, rows = [], pts = [0, 0], cmp = (a, b, name, show) => { const w = a > b ? 0 : b > a ? 1 : -1; if (w >= 0) pts[w]++; rows.push([name, show[0], show[1], w]); };
    cmp(P[0].length, P[1].length, '🃏 Carte', [P[0].length, P[1].length]);
    const dn = P.map(p => p.filter(c => su(c) === 'd').length); cmp(dn[0], dn[1], '♦ Denari', dn);
    const sb = P.map(p => p.includes('d7') ? 1 : 0); cmp(sb[0], sb[1], '7♦ Settebello', sb.map(x => x ? '✔' : ''));
    const pr = P.map(primiera); cmp(pr[0], pr[1], '👑 Primiera', pr);
    pts[0] += S.sc[0]; pts[1] += S.sc[1]; rows.push(['🧹 Scope', S.sc[0], S.sc[1], -2]);
    return { rows, pts };
  }
  function act(T, seat, a) {
    const S = T.S;
    if (a.k === 'ok') {
      if (S.ph !== 'tally') return false;
      S.ok[seat] = 1; if (S.ai >= 0) S.ok[S.ai] = 1;
      if (S.ok[0] && S.ok[1]) { S.dl = 1 - S.dl; S.hand++; S.tl = null; S.ph = 'play'; deal(S); }
      return true;
    }
    if (a.k !== 'play' || S.ph !== 'play' || seat !== S.tu) return false;
    const c = a.c, i = S.h[seat].indexOf(c); if (i < 0) return false;
    const opts = options(S.tb, c), oi = opts.length ? Math.max(0, Math.min(opts.length - 1, a.o | 0)) : -1, take = oi >= 0 ? opts[oi] : [];
    S.h[seat].splice(i, 1);
    const lastPlay = !S.d.length && !S.h[0].length && !S.h[1].length;
    let scopa = false;
    if (take.length) { S.tb = S.tb.filter(x => !take.includes(x)); S.pl[seat].push(c, ...take); S.last = seat; if (!S.tb.length && !lastPlay) { S.sc[seat]++; scopa = true; } }
    else S.tb.push(c);
    S.mv = { id: ++S.mid, by: seat, c, take, scopa };
    S.tu = 1 - seat;
    if (!S.h[0].length && !S.h[1].length) {
      if (S.d.length) for (let k = 0; k < 3; k++) { S.h[1 - S.dl].push(S.d.pop()); S.h[S.dl].push(S.d.pop()); }
      else {   // fine della smazzata: le carte in tavola a chi ha preso per ultimo, poi il conteggio
        if (S.tb.length && S.last >= 0) { S.pl[S.last].push(...S.tb); S.mv.rest = S.tb.slice(); S.mv.restTo = S.last; S.tb = []; }
        const t = tally(S); S.tl = t; S.tot[0] += t.pts[0]; S.tot[1] += t.pts[1]; S.ok = [0, 0];
        if ((S.tot[0] >= 11 || S.tot[1] >= 11) && S.tot[0] !== S.tot[1]) { S.ph = 'end'; S.win = S.tot[0] > S.tot[1] ? 0 : 1; S.why = '🧹 ' + S.tot[0] + ' a ' + S.tot[1]; }
        else S.ph = 'tally';
        S.tu = -1;
      }
    }
    return true;
  }
  // il Conte: valuta ogni carta e ogni presa (carte, denari, settebello, sette, scopa) e quanto lascia all'altro per una scopa
  function aiTurn(T) {
    const S = T.S, me = S.ai;
    if (S.ph === 'tally') return S.ok[me] ? null : { k: 'ok' };
    if (S.ph !== 'play' || S.tu !== me) return null;
    let best = null;
    for (const c of S.h[me]) {
      const opts = options(S.tb, c);
      const cand = opts.length ? opts.map((g, o) => ({ o, g })) : [{ o: -1, g: [] }];
      for (const { o, g } of cand) {
        const all = g.length ? [c, ...g] : [], left = S.tb.filter(x => !g.includes(x)).concat(g.length ? [] : [c]);
        let sc = all.length * 1 + all.filter(x => su(x) === 'd').length * 1.3 + (all.includes('d7') ? 12 : 0) + all.filter(x => val(x) === 7).length * 2.5;
        if (g.length && !left.length) sc += 18;   // scopa
        const sum = left.reduce((a, x) => a + val(x), 0);
        if (left.length && sum <= 10) sc -= 7;   // l'altro potrebbe fare scopa
        if (!g.length) sc -= (su(c) === 'd' ? 2 : 0) + (val(c) === 7 ? 4 : 0) + (c === 'd7' ? 20 : 0) - val(c) * 0.15;
        sc += Math.random() * 0.8;
        if (!best || sc > best.sc) best = { sc, c, o };
      }
    }
    return { k: 'play', c: best.c, o: best.o };
  }

  // ---- visuale (carte come <img> mosse con le transizioni CSS, come la Briscola) ----
  const css = document.createElement('style');
  css.textContent = `
.scRoot{background:radial-gradient(ellipse at 50% 50%,#2f7a46 0%,#1d5230 55%,#0f2c1a 100%)!important}
.scRoot img.sc{position:absolute;left:0;top:0;border-radius:6px;box-shadow:0 3px 8px rgba(0,0,0,.45);transition:transform .45s cubic-bezier(.2,.8,.3,1),opacity .45s,filter .2s;will-change:transform}
.scRoot img.sc.glow{filter:drop-shadow(0 0 6px #ffe14a) drop-shadow(0 0 3px #ffe14a)}
.scRoot img.sc.sel{filter:drop-shadow(0 0 8px #7bff8a)}
.scOpts{position:absolute;left:8px;right:8px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;z-index:3}
.scOpts button{padding:9px 12px;border-radius:12px;border:2px solid #e0b84a;background:#2a1e18;color:#fff;font-weight:800;font-size:15px;box-shadow:0 3px 10px rgba(0,0,0,.5)}
.scOpts button.put{border-color:#8a6a4a}
.scInfo{position:absolute;left:10px;color:#f4ead2;font-size:12px;font-weight:700;text-shadow:0 1px 3px #000;z-index:2}
.scFx{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(.6);font:900 46px system-ui;color:#ffe14a;text-shadow:0 4px 12px #000;opacity:0;transition:transform .35s cubic-bezier(.2,1.6,.5,1),opacity .35s;pointer-events:none;z-index:5;white-space:nowrap}
.scFx.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.scTally{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#2a1e18;color:#f4ead2;border:3px solid #c99a44;border-radius:16px;padding:14px;width:min(330px,90vw);z-index:4;box-shadow:0 10px 40px rgba(0,0,0,.7);text-align:center}
.scTally table{width:100%;border-collapse:collapse;margin:8px 0;font-size:14px}.scTally td{padding:4px 6px;border-bottom:1px solid #4a3020}.scTally td.w{color:#ffe14a;font-weight:800}
.scTally button{width:100%;padding:11px;border-radius:10px;border:2px solid #e0b84a;background:#3e8a4a;color:#fff;font-weight:800;font-size:16px;margin-top:6px}`;
  document.head.appendChild(css);
  function view(T) {
    const r = T.root; r.classList.add('scRoot');
    r.innerHTML = '<div class="tvTop"></div><div class="scInfo"></div><div class="scOpts"></div><div class="tvHint"></div><div class="scFx"></div>';
    T.els = new Map(); T.sel = null; T.seenMv = T.S.mv ? T.S.mv.id : 0; T.hold = 0;
    T.ro = () => { if (T.root === r) { for (const e of T.els.values()) e.remove(); T.els.clear(); render(T); } }; window.addEventListener('resize', T.ro);
  }
  const geo = T => { const W = T.root.clientWidth, H = T.root.clientHeight, cw = Math.min(W / 5.6, (H - 120) / 6.3, 110); return { W, H, cw, ch: cw * CARTE.H / CARTE.W }; };
  function el(T, code, cw) {
    let e = T.els.get(code);
    if (!e) { e = document.createElement('img'); e.className = 'sc'; e.draggable = false; T.root.appendChild(e); T.els.set(code, e); e.onclick = () => tap(T, code); }
    return e;
  }
  function put(T, code, x, y, face, cw, r = 0, s = 1, z = 1, op = 1) {
    const e = el(T, code, cw), src = face ? CARTE.url(code[0], val(code), Math.round(cw)) : CARTE.url('d', 0, Math.round(cw));
    if (e.dataset.src !== src) { e.src = src; e.dataset.src = src; }
    e.style.width = cw + 'px'; e.style.zIndex = z; e.style.opacity = op;
    e.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${s})`;
    e.dataset.on = 1;
  }
  const seatView = T => T.me === 1 ? 1 : 0;   // in basso: io (chi guarda vede il primo giocatore in basso)
  function render(T) {
    if (!T.root || !window.CARTE) return;
    const S = T.S, g = geo(T), { W, H, cw, ch } = g, me = seatView(T), op = 1 - me;
    for (const e of T.els.values()) e.dataset.on = '';
    // mossa nuova: la carta giocata va prima in tavola accanto a quelle che prende, poi tutte nel mazzetto
    const mv = S.mv; let landing = null;
    if (mv && mv.id !== T.seenMv) {
      T.seenMv = mv.id; T.sel = null;
      if (mv.take.length || mv.rest) { landing = mv; T.hold = Date.now() + 750; clearTimeout(T.ht); T.ht = setTimeout(() => render(T), 760); }
      if (mv.scopa) { const f = T.root.querySelector('.scFx'); f.textContent = '🧹 SCOPA!'; f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 1300); [0, 4, 7, 12, 16].forEach((n, i) => beep(523 * Math.pow(2, n / 12), 0.18, 0.05, i * 0.07, 'triangle')); }
      thud(0.4, mv.take.length ? 500 : 800); if (mv.take.length) beep(1200, 0.04, 0.03, 0.1, 'square');
    } else if (Date.now() < T.hold && mv) landing = mv;
    // tavola: carte in griglia al centro
    const tb = landing ? S.tb.concat(landing.take, landing.rest || [], landing.take.length ? [landing.c] : []) : S.tb;
    const cols = Math.max(4, Math.min(6, Math.ceil(tb.length / 2))), gap = cw * 0.12, ty0 = H / 2 - ch - gap / 2;
    const myOpts = T.sel && S.tu === T.me ? options(S.tb, T.sel) : [], glow = new Set(myOpts.flat());
    tb.forEach((c, i) => { const row = Math.floor(i / cols), rn = Math.min(cols, tb.length - row * cols), x = W / 2 - (rn * cw + (rn - 1) * gap) / 2 + (i % cols) * (cw + gap), y = ty0 + Math.floor(i / cols) * (ch + gap); put(T, c, x, y, true, cw, 0, 1, 2 + i); T.els.get(c).classList.toggle('glow', glow.has(c) || (landing && (landing.take.includes(c) || c === landing.c))); });
    // mani: la mia in basso a ventaglio (scoperta), l'altra in alto coperta
    const hand = (cards, bottom, face) => cards.forEach((c, i) => { const n = cards.length, x = W / 2 - cw / 2 + (i - (n - 1) / 2) * cw * 1.05, y = bottom ? H - ch - 58 - (T.sel === c ? 18 : 0) : 62; put(T, c, x, y, face, cw, (i - (n - 1) / 2) * (bottom ? 5 : -5), 1, 20 + i); const e = T.els.get(c); e.classList.toggle('sel', T.sel === c); e.classList.remove('glow'); });
    hand(S.h[me].filter(c => !landing || c !== landing.c), true, T.me >= 0);
    hand(S.h[op].filter(c => !landing || c !== landing.c), false, false);
    // mazzetti delle prese (in basso a sinistra il mio, in alto a destra l'altro) e mazzo da pescare
    const pile = (cards, x, y) => cards.forEach((c, i) => { if (landing && (landing.take.includes(c) || c === landing.c || (landing.rest || []).includes(c))) return; put(T, c, x + Math.min(i, 8) * 0.6, y - Math.min(i, 8) * 0.6, false, cw * 0.7, 90, 1, 1 + Math.min(i, 8), i < cards.length - 9 ? 0 : 1); T.els.get(c).classList.remove('glow', 'sel'); });
    pile(S.pl[me], 14, H - ch * 0.7 - 70); pile(S.pl[op], W - cw * 0.7 - 30, 70 + ch * 0.2);
    S.d.forEach((c, i) => { if (i < S.d.length - 6) { const e = T.els.get(c); if (e) e.dataset.on = ''; return; } put(T, c, 14 + i * 0.4, H / 2 - ch * 0.35 - i * 0.4, false, cw * 0.7, 0, 1, 1); });
    for (const [c, e] of T.els) if (!e.dataset.on) { e.remove(); T.els.delete(c); }
    // scritte
    const top = T.root.querySelector('.tvTop'), pl = i => `<div class="pl${S.ph === 'play' && S.tu === i ? ' on' : ''}">${i === T.me ? '⭐ ' : ''}${esc(S.n[i] || '?')} <b>${S.tot[i]}</b><br><small>🧹 ${S.sc[i]} scope · 🃏 ${S.pl[i].length}</small></div>`;
    top.innerHTML = pl(op) + `<div class="mid">a 11<br>🃏 ${S.d.length}${T.watch ? '<br>👀 ' + T.watch : ''}</div>` + pl(me);
    const info = T.root.querySelector('.scInfo'); info.style.top = (H / 2 - ch * 0.35 - 22) + 'px'; info.textContent = S.d.length ? 'Mazzo' : '';
    const opts = T.root.querySelector('.scOpts'); opts.style.bottom = (ch + 70) + 'px'; opts.innerHTML = '';
    if (T.sel && S.ph === 'play' && S.tu === T.me) {
      if (myOpts.length) myOpts.forEach((gq, i) => { const b = document.createElement('button'); b.textContent = 'Prendi ' + gq.map(short).join(' + '); b.onclick = () => play(T, T.sel, i); opts.appendChild(b); });
      else { const b = document.createElement('button'); b.className = 'put'; b.textContent = 'Metti giù ' + short(T.sel); b.onclick = () => play(T, T.sel, -1); opts.appendChild(b); }
    }
    const h = T.root.querySelector('.tvHint'), who = esc(S.n[S.tu] || '');
    h.innerHTML = S.ph !== 'play' ? '' : S.tu === T.me ? (T.sel ? (myOpts.length > 1 ? 'Questa carta prende in più modi: <b>scegli</b> quale presa.' : 'Tocca il pulsante (o di nuovo la carta) per giocarla.') : 'Tocca a te: tocca una carta, le prese si illuminano.') : T.me < 0 ? '👀 Gioca ' + who + '.' : 'Gioca ' + who + '…';
    tallyBox(T);
    SCO.endBox(esc(S.n[0]) + ' <b>' + S.tot[0] + '</b> · ' + esc(S.n[1]) + ' <b>' + S.tot[1] + '</b>');
  }
  function tap(T, code) {
    const S = T.S; if (S.ph !== 'play' || S.tu !== T.me || T.me < 0 || !S.h[T.me].includes(code)) return;
    if (T.sel === code) { const o = options(S.tb, code); if (o.length <= 1) { play(T, code, o.length ? 0 : -1); return; } }
    T.sel = code; beep(900, 0.03, 0.02); render(T);
  }
  function play(T, c, o) { T.sel = null; SCO.act({ k: 'play', c, o }); }
  function tallyBox(T) {
    const S = T.S, old = T.root.querySelector('.scTally');
    if (S.ph !== 'tally' || !S.tl) { if (old) old.remove(); return; }
    const key = S.hand + ':' + S.ok.join(''); if (old && old.dataset.k === key) return; if (old) old.remove();
    const e = document.createElement('div'); e.className = 'scTally'; e.dataset.k = key;
    const rows = S.tl.rows.map(([n, a, b, w]) => `<tr><td style="text-align:left">${n}</td><td class="${w === 0 ? 'w' : ''}">${a}</td><td class="${w === 1 ? 'w' : ''}">${b}</td></tr>`).join('');
    const wait = T.me >= 0 && S.ok[T.me];
    e.innerHTML = `<h3 style="margin:0">Fine smazzata ${S.hand}</h3><table><tr><td></td><td><b>${esc(S.n[0])}</b></td><td><b>${esc(S.n[1])}</b></td></tr>${rows}<tr><td style="text-align:left"><b>Punti</b></td><td><b>+${S.tl.pts[0]}</b></td><td><b>+${S.tl.pts[1]}</b></td></tr><tr><td style="text-align:left"><b>Totale</b></td><td><b>${S.tot[0]}</b></td><td><b>${S.tot[1]}</b></td></tr></table>`
      + (T.me >= 0 ? `<button type="button"${wait ? ' disabled' : ''}>${wait ? 'Aspetto ' + esc(S.n[1 - T.me]) + '…' : '▶ Prossima smazzata'}</button>` : '<p>Si aspetta la prossima smazzata…</p>');
    const b = e.querySelector('button'); if (b) b.onclick = () => SCO.act({ k: 'ok' });
    T.root.appendChild(e);
  }
  const SCO = cqTable({
    id: 'sc', title: 'Scopa', emoji: '🧹', aiName: 'Il Conte 🎩', rule: 'carte, denari, settebello, primiera e scope: si vince a 11',
    near: () => false, newMatch, act, aiTurn, aiDelay: T => T.S.ph === 'tally' ? 600 : 1300 + (T.S.mv && T.S.mv.take.length ? 700 : 0),
    view, render: T => { if (window.CARTE) render(T); else bcLoad().then(() => render(T)).catch(() => {}); },
    drop: T => { clearTimeout(T.ht); if (T.ro) window.removeEventListener('resize', T.ro); },
  });
  // seduti al tavolino: con chi? (gli amici seduti, o il Conte) - chiamato dalla scelta "🃏 Carte" della Briscola
  SCO.pickSeated = () => {
    const G = cq.g, N = cq.net, busy = new Set(); SCO.games().forEach(x => x.S.p.forEach(p => p && busy.add(p)));
    const fr = G && N ? G.chars.filter(c => c.remote && c.alive && c.sit != null && !busy.has(c.sid)) : [];
    const m = document.createElement('div'); m.id = 'tvModal';
    m.innerHTML = `<div class="tvBox"><h2>🧹 Scopa al tavolino</h2><p>Con chi giochi?</p>${fr.map((c, i) => `<button type="button" data-k="f${i}">🙂 ${esc(c.name)}</button>`).join('') || '<p style="opacity:.7">Nessun amico seduto al tavolino: invita qualcuno a sedersi!</p>'}<button type="button" data-k="ai">🎩 Il Conte (computer)</button><button type="button" data-k="x">Annulla</button></div>`;
    document.body.appendChild(m);
    m.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { m.remove(); const k = b.dataset.k; bcLoad().then(() => { if (k === 'ai') SCO.startAI(); else if (k[0] === 'f') { const c = fr[+k.slice(1)]; if (c) SCO.challenge(c); } }).catch(() => cqToast('Non riesco a caricare le carte: controlla la connessione e riprova.')); }; });
  };
  const baseTick = SCO.tick; let wt = 0;
  SCO.tick = (G, dt) => {
    baseTick(G, dt);
    if ((wt -= dt) > 0) return; wt = 0.3;
    const box = document.getElementById('ciack'); if (!box) return;
    let b = document.getElementById('scWatchB');
    if (!b) { b = document.createElement('button'); b.id = 'scWatchB'; b.className = 'btn tvHallB'; b.type = 'button'; b.hidden = true; b.textContent = '👀 Guarda la scopa'; b.style.bottom = '300px'; box.appendChild(b); }
    const N = cq.net, gs = SCO.games().filter(x => !x.S.p.includes(N && N.sid)), near = cq.map === 'hotel' && Math.hypot(cq.x - CQ_SALA.x, cq.y - CQ_SALA.y) < 4.2;
    const show = !!(G && G.hall && near && gs.length && !SCO.T && cq.sit == null && cqHallFree());
    if (b.hidden === show) b.hidden = !show;
    b.onclick = () => { const x = gs[0]; if (x) bcLoad().then(() => SCO.watch(x.key)).catch(() => {}); };
  };
  return Object.assign(SCO, { options, tally, primiera, deal, newMatch: S0 => newMatch(S0), aiTurn: T => aiTurn(T) });
})();
