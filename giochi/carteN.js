// ==== CARTE AL TAVOLINO IN 3 E IN 4 (07-11-2026, richiesta utente): Briscola a 3 e a 4 a coppie, Scopa a 3 e a 4 a coppie, Scopone scientifico ====
// Solo giocatori VERI (scelta dell'utente: i posti vuoti NON li prende il computer), Briscola SENZA segni. Rete col tavolo a piu' posti giochi/lib/tavoloN.js
// (id 'cn'); carte napoletane di giochi/lib/carte.js (bcLoad). Le partite in 2 restano quelle di briscola.js e scopa.js.
// Posti in senso antiorario: dopo di me gioca chi mi sta a destra. A 4 le coppie sono i posti 0+2 e 1+3 (il compagno sta di fronte).
// REGOLE
//  Briscola a 3: si toglie il 2 di coppe (39 carte), 3 carte a testa, ognuno per se', vince chi fa piu' punti (su 120). A 4: due coppie, 60 a 60 = pari.
//  Chi prende pesca per primo, poi gli altri in ordine; l'ultima carta del mazzo e' la briscola scoperta.
//  Scopa a 3: ognuno per se', 3 carte a testa e 4 in tavola. Scopa a 4: coppie, 3 carte a testa e 4 in tavola. Scopone scientifico: coppie, 10 carte a
//  testa e niente in tavola. Prese come nella Scopa in 2 (prima la carta di pari valore, poi le somme), scopa = tavola vuota (non all'ultima giocata),
//  le carte rimaste vanno a chi ha preso per ultimo. Punti: carte, denari, settebello, primiera (solo se uno ne ha piu' di tutti), scope. Si vince a 11.
// In node: require('giochi/carteN.js') = il motore (prove/cn1.js).
(function () {
  const E = (() => {
    const val = c => +c.slice(1), su = c => c[0];
    const PTS = { 1: 11, 3: 10, 10: 4, 9: 3, 8: 2 }, STR = { 1: 10, 3: 9, 10: 8, 9: 7, 8: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 };
    const PRIM = [0, 16, 12, 13, 14, 15, 18, 21, 10, 10, 10];
    const shuffle = d => { for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; };
    const deck = no => { const d = []; for (const s of 'dcsb') for (let r = 1; r <= 10; r++) if (s + r !== no) d.push(s + r); return shuffle(d); };
    const teams = n => n === 4;
    const unit = (n, seat) => teams(n) ? seat % 2 : seat;   // a chi vanno punti e prese: la coppia (a 4) o il giocatore
    const nUnits = n => teams(n) ? 2 : n;
    const members = (n, u) => teams(n) ? [u, u + 2] : [u];
    // vince chi ha di piu' (solo se e' uno solo): -1 = nessuno
    const best = arr => { const m = Math.max(...arr); return m > 0 && arr.filter(x => x === m).length === 1 ? arr.indexOf(m) : -1; };
    // ---- BRISCOLA ----
    function bcNew(S0) {
      const n = S0.p.length, dl = S0.dl != null ? (S0.dl + 1) % n : Math.floor(Math.random() * n);
      const d = deck(n === 3 ? 'c2' : '');
      const S = { gm: 'bc', d, bc: d[0], b: d[0][0], h: S0.p.map(() => []), t: [], w: Array.from({ length: nUnits(n) }, () => []), dl, tid: 0, lt: null };
      for (let k = 0; k < 3; k++) for (let i = 1; i <= n; i++) S.h[(dl + i) % n].push(S.d.pop());
      S.tu = (dl + 1) % n;
      return S;
    }
    function bcWinner(S) {
      let w = S.t[0];
      for (const x of S.t.slice(1)) {
        const a = w[1], c = x[1];
        if (su(c) === su(a) ? STR[val(c)] > STR[val(a)] : su(c) === S.b) w = x;
      }
      return w[0];
    }
    function bcPlay(S, seat, c) {
      if (S.ph !== 'play' || seat !== S.tu || S.t.length >= S.h.length) return false;
      const i = S.h[seat].indexOf(c); if (i < 0) return false;
      S.h[seat].splice(i, 1); S.t.push([seat, c]);
      S.tu = S.t.length < S.h.length ? (seat + 1) % S.h.length : -1;
      return true;
    }
    // presa completa: la si porta via, si pesca, si va avanti (o si contano i punti)
    function bcResolve(S) {
      const n = S.h.length; if (S.t.length < n) return false;
      const w = bcWinner(S), cards = S.t.map(x => x[1]);
      S.w[unit(n, w)].push(...cards); S.lt = { id: ++S.tid, w, c: cards }; S.t = [];
      if (S.d.length) for (let k = 0; k < n; k++) S.h[(w + k) % n].push(S.d.pop());
      S.tu = w;
      if (S.h.every(h => !h.length)) {
        S.pts = S.w.map(cs => cs.reduce((a, c) => a + (PTS[val(c)] || 0), 0));
        S.ph = 'end'; S.win = best(S.pts); S.winMe = S.win < 0 ? [] : members(n, S.win); S.tu = -1;
      }
      return true;
    }
    // ---- SCOPA ----
    function options(tb, c) {
      const v = val(c), same = tb.filter(x => val(x) === v);
      if (same.length) return same.map(x => [x]);
      const out = [], n = tb.length;
      for (let m = 1; m < (1 << n); m++) { let s = 0; const g = []; for (let i = 0; i < n; i++) if (m & (1 << i)) { s += val(tb[i]); g.push(tb[i]); } if (s === v && g.length > 1) out.push(g); }
      return out;
    }
    function scDeal(S) {
      const n = S.h.length, each = S.o.v === 'scn' ? 10 : 3, onTb = S.o.v === 'scn' ? 0 : 4;
      let d; do { d = deck(''); } while (onTb && d.slice(-onTb).filter(c => val(c) === 10).length >= 3);   // 3 o 4 re in tavola: si rimescola
      S.d = d; S.tb = []; for (let i = 0; i < onTb; i++) S.tb.push(S.d.pop());
      S.h = S.h.map(() => []); for (let k = 0; k < each; k++) for (let i = 1; i <= n; i++) S.h[(S.dl + i) % n].push(S.d.pop());
      S.pl = Array.from({ length: nUnits(n) }, () => []); S.sc = S.pl.map(() => 0); S.last = -1;
      S.tu = (S.dl + 1) % n; S.mv = null; S.ok = S.h.map(() => 0);
    }
    function scNew(S0) {
      const n = S0.p.length;
      const S = { gm: 'sc', o: S0.o, h: S0.p.map(() => []), dl: S0.dl != null ? (S0.dl + 1) % n : Math.floor(Math.random() * n), hand: 1, tot: Array(nUnits(n)).fill(0), tl: null, mid: 0 };
      scDeal(S); return S;
    }
    function primiera(cards) { let t = 0; for (const s of 'dcsb') { const b = Math.max(0, ...cards.filter(c => su(c) === s).map(c => PRIM[val(c)])); if (!b) return 0; t += b; } return t; }
    function scTally(S) {
      const P = S.pl, rows = [], pts = P.map(() => 0);
      const row = (name, vals, show) => { const w = best(vals); if (w >= 0) pts[w]++; rows.push([name, show || vals, w]); };
      row('Carte', P.map(p => p.length));
      row('Denari', P.map(p => p.filter(c => su(c) === 'd').length));
      const sb = P.map(p => p.includes('d7') ? 1 : 0); row('Settebello', sb, sb.map(x => x ? '✔' : ''));
      row('Primiera', P.map(primiera));
      S.sc.forEach((x, u) => { pts[u] += x; }); rows.push(['Scope', S.sc.slice(), -2]);
      return { rows, pts };
    }
    function scPlay(S, seat, c, o) {
      if (S.ph !== 'play' || seat !== S.tu) return false;
      const n = S.h.length, i = S.h[seat].indexOf(c); if (i < 0) return false;
      const opts = options(S.tb, c), oi = opts.length ? Math.max(0, Math.min(opts.length - 1, o | 0)) : -1, take = oi >= 0 ? opts[oi] : [];
      S.h[seat].splice(i, 1);
      const lastPlay = !S.d.length && S.h.every(h => !h.length), u = unit(n, seat);
      let scopa = false;
      if (take.length) { S.tb = S.tb.filter(x => !take.includes(x)); S.pl[u].push(c, ...take); S.last = u; if (!S.tb.length && !lastPlay) { S.sc[u]++; scopa = true; } }
      else S.tb.push(c);
      S.mv = { id: ++S.mid, by: seat, c, take, scopa };
      S.tu = (seat + 1) % n;
      if (S.h.every(h => !h.length)) {
        if (S.d.length) for (let k = 0; k < 3; k++) for (let j = 1; j <= n; j++) S.h[(S.dl + j) % n].push(S.d.pop());
        else {   // fine della smazzata
          if (S.tb.length && S.last >= 0) { S.pl[S.last].push(...S.tb); S.mv.rest = S.tb.slice(); S.mv.restTo = S.last; S.tb = []; }
          const t = scTally(S); S.tl = t; t.pts.forEach((x, k) => { S.tot[k] += x; }); S.ok = S.h.map(() => 0); S.tu = -1;
          const top = Math.max(...S.tot);
          if (top >= 11 && best(S.tot) >= 0) { S.ph = 'end'; S.win = best(S.tot); S.winMe = members(n, S.win); }
          else S.ph = 'tally';
        }
      }
      return true;
    }
    function scOk(S, seat) {
      if (S.ph !== 'tally') return false;
      S.ok[seat] = 1;
      if (S.ok.every(x => x)) { S.dl = (S.dl + 1) % S.h.length; S.hand++; S.tl = null; S.ph = 'play'; scDeal(S); }
      return true;
    }
    return { val, su, PTS, STR, unit, nUnits, members, best, bcNew, bcWinner, bcPlay, bcResolve, options, scNew, scDeal, scPlay, scOk, scTally, primiera };
  })();
  if (typeof window === 'undefined') { if (typeof module !== 'undefined') module.exports = E; return; }

  const { val, su, unit, nUnits, members } = E;
  const MODES = {
    b3: { gm: 'bc', n: 3, t: 'Briscola in tre', r: 'Briscola in tre, ognuno per sé' },
    b4: { gm: 'bc', n: 4, t: 'Briscola in quattro', r: 'Briscola in quattro a coppie' },
    s3: { gm: 'sc', n: 3, v: 'sc', t: 'Scopa in tre', r: 'Scopa in tre, ognuno per sé' },
    s4: { gm: 'sc', n: 4, v: 'sc', t: 'Scopa in quattro', r: 'Scopa in quattro a coppie' },
    sn: { gm: 'sc', n: 4, v: 'scn', t: 'Scopone scientifico', r: 'Scopone scientifico a coppie' },
  };
  const md = S => MODES[S.o && S.o.m] || MODES.b3;
  const SUIT = { d: 'denari', c: 'coppe', s: 'spade', b: 'bastoni' };
  const unitName = (S, u, me) => {
    const n = S.p.length, m = members(n, u);
    if (me >= 0 && m.includes(me)) return m.length > 1 ? 'Voi' : 'Tu';
    return m.map(i => S.n[i]).join(' e ');
  };

  // ---- visuale: carte <img> mosse con le transizioni CSS (come Briscola e Scopa in 2) ----
  const css = document.createElement('style');
  css.textContent = `
.cnRoot{background:radial-gradient(ellipse at 50% 46%,#2f7a46 0%,#1d5230 58%,#0f2c1a 100%)!important}
.cnRoot img.cn{position:absolute;left:0;top:0;border-radius:6px;box-shadow:0 3px 8px rgba(0,0,0,.45);transition:transform .45s cubic-bezier(.2,.8,.3,1),opacity .4s,filter .2s;will-change:transform}
.cnRoot img.cn.glow{filter:drop-shadow(0 0 6px #ffe14a) drop-shadow(0 0 3px #ffe14a)}
.cnRoot img.cn.sel{filter:drop-shadow(0 0 8px #7bff8a)}
.cnRoot img.cn.can{filter:drop-shadow(0 0 3px #e0b84a)}
.cnPl{position:absolute;background:rgba(20,16,14,.84);border:2px solid #6a4a2a;border-radius:11px;padding:4px 8px;color:#f4ead2;font:600 12px/1.25 system-ui,sans-serif;z-index:6;max-width:44vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;transition:border-color .2s,box-shadow .2s}
.cnPl b{font-size:15px}.cnPl.on{border-color:#ffe14a;box-shadow:0 0 12px rgba(255,225,74,.65)}
.cnPl.t0{border-left:6px solid #e0b84a}.cnPl.t1{border-left:6px solid #5aa8f0}
.cnMid{position:absolute;left:50%;top:6px;transform:translateX(-50%);background:rgba(20,16,14,.84);border:2px solid #6a4a2a;border-radius:11px;padding:4px 10px;color:#e0b84a;font:800 12px system-ui;z-index:6;pointer-events:none;white-space:nowrap}
.cnOpts{position:absolute;left:8px;right:8px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;z-index:7}
.cnOpts button{padding:9px 12px;border-radius:12px;border:2px solid #e0b84a;background:#2a1e18;color:#fff;font-weight:800;font-size:15px;box-shadow:0 3px 10px rgba(0,0,0,.5)}
.cnOpts button.put{border-color:#8a6a4a}
.cnFx{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(.6);font:900 44px system-ui;color:#ffe14a;text-shadow:0 4px 12px #000;opacity:0;transition:transform .35s cubic-bezier(.2,1.6,.5,1),opacity .35s;pointer-events:none;z-index:8;white-space:nowrap}
.cnFx.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.cnCnt{position:absolute;color:#f4ead2;font:800 12px system-ui;text-shadow:0 1px 3px #000;z-index:6;pointer-events:none;transform:translate(-50%,0)}
.cnTally{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#2a1e18;color:#f4ead2;border:3px solid #c99a44;border-radius:16px;padding:14px;width:min(340px,92vw);z-index:9;box-shadow:0 10px 40px rgba(0,0,0,.7);text-align:center;font-family:system-ui,sans-serif}
.cnTally h2{margin:0 0 4px;font-size:20px}.cnTally table{width:100%;border-collapse:collapse;margin:8px 0;font-size:13px}.cnTally td,.cnTally th{padding:4px 5px;border-bottom:1px solid #4a3020}.cnTally td.w{color:#ffe14a;font-weight:800}
.cnTally th{font-size:12px;color:#e0b84a}
.cnTally button{width:100%;padding:11px;border-radius:10px;border:2px solid #e0b84a;background:#3e8a4a;color:#fff;font-weight:800;font-size:16px;margin-top:6px}.cnTally button:disabled{opacity:.5}
.tvEnd table{width:100%;border-collapse:collapse;margin:6px 0;font-size:14px}.tvEnd td{padding:4px 6px;border-bottom:1px solid #4a3020}.tvEnd td.w{color:#ffe14a;font-weight:800}`;
  document.head.appendChild(css);

  function view(T) {
    const r = T.root; r.classList.add('cnRoot');
    r.innerHTML = '<div class="cnMid"></div><div class="cnOpts"></div><div class="tvHint"></div><div class="cnFx"></div>';
    T.els = new Map(); T.pl = []; T.sel = null; T.seenMv = T.S.mv ? T.S.mv.id : 0; T.seenLt = T.S.lt ? T.S.lt.id : 0; T.land = null;
    T.ro = () => { if (T.root === r) render(T); }; window.addEventListener('resize', T.ro);
  }
  // geometria: io in basso, gli altri intorno (in senso antiorario: dopo di me quello a destra)
  function geo(T) {
    const r = T.root, W = r.clientWidth, H = r.clientHeight, S = T.S, n = S.p.length, side = n === 4 || n === 3;
    const cw = Math.min(W / (side ? 6.6 : 5.6), (H - 150) / 6.6, 96), ch = cw * CARTE.H / CARTE.W, sw = cw * 0.52, sh = sw * CARTE.H / CARTE.W;
    const bottom = T.me >= 0 ? T.me : 0, rel = s => (s - bottom + n) % n;
    const cy = H * 0.44;
    const spot = k => {   // k = posto relativo
      if (k === 0) return { x: W / 2, y: H - ch - 52, d: 'b' };
      if (n === 4) return [null, { x: W - sh * 0.5 - 8, y: H * 0.40, d: 'r' }, { x: W / 2, y: 58 + sh * 0.5, d: 't' }, { x: sh * 0.5 + 8, y: H * 0.40, d: 'l' }][k];
      return [null, { x: W - sh * 0.5 - 8, y: H * 0.30, d: 'r' }, { x: sh * 0.5 + 8, y: H * 0.30, d: 'l' }][k];
    };
    const deck = n === 4 ? { x: cw * 1.5 + 4, y: H * 0.17 } : { x: W / 2 - cw * 0.35, y: H * 0.12 };
    return { W, H, n, cw, ch, sw, sh, cy, bottom, rel, spot, deck };
  }
  function el(T, code) {
    let e = T.els.get(code);
    if (!e) { e = document.createElement('img'); e.className = 'cn'; e.draggable = false; e.style.opacity = 0; T.root.appendChild(e); T.els.set(code, e); e.onclick = () => tap(T, code); }
    return e;
  }
  function put(T, code, x, y, face, w, r = 0, z = 1, op = 1) {   // x, y = centro della carta
    const e = el(T, code), px = Math.round(w), src = face ? CARTE.url(code[0], val(code), px) : CARTE.url('d', 0, px), h = w * CARTE.H / CARTE.W;
    if (e.dataset.src !== src) { e.src = src; e.dataset.src = src; }
    e.style.width = w + 'px'; e.style.zIndex = z; e.style.opacity = op;
    e.style.transform = `translate(${x - w / 2}px,${y - h / 2}px) rotate(${r}deg)`;
    T.used.add(code); e.className = 'cn';
    return e;
  }
  // il mucchio delle prese di una coppia o di un giocatore, vicino a chi le ha fatte
  function pileSpot(T, g, u) {
    const S = T.S, m = members(g.n, u), k = Math.min(...m.map(g.rel)), s = g.spot(k);
    if (k === 0) return { x: g.cw * 0.75 + 6, y: g.H - g.ch - 52 - g.ch * 0.95 };
    if (s.d === 't') return { x: g.W / 2 + g.cw * 1.9, y: s.y + 6 };
    return { x: s.x, y: s.y + g.H * 0.18 + 64 };
  }
  function pile(T, g, u, cards, skip) {
    const p = pileSpot(T, g, u);
    cards.forEach((c, i) => { if (skip && skip.has(c)) return; const k = Math.min(i, 8); put(T, c, p.x + k * 0.5, p.y - k * 0.5, false, g.cw * 0.6, 90, 1 + k, i < cards.length - 9 ? 0 : 1); });
  }
  function hands(T, g) {
    const S = T.S;
    S.h.forEach((cards, s) => {
      const k = g.rel(s), sp = g.spot(k), n = cards.length;
      if (k === 0) {
        const step = Math.min(g.cw * 1.05, n > 1 ? (g.W - 16 - g.cw) / (n - 1) : 0);
        cards.forEach((c, i) => {
          const x = g.W / 2 + (i - (n - 1) / 2) * step, y = sp.y + g.ch / 2 - (T.sel === c ? 16 : 0);
          const e = put(T, c, x, y, T.me >= 0, g.cw, (i - (n - 1) / 2) * (n > 5 ? 2.5 : 5), 30 + i);
          if (T.sel === c) e.classList.add('sel'); else if (canPlay(T) && S.gm === 'bc') e.classList.add('can');
        });
        return;
      }
      const step = Math.min(g.sw * 0.42, (g.H * 0.36) / Math.max(1, n));
      cards.forEach((c, i) => {
        const o = (i - (n - 1) / 2) * (sp.d === 't' ? g.sw * 0.55 : step);
        if (sp.d === 't') put(T, c, sp.x + o, sp.y, false, g.sw, (i - (n - 1) / 2) * -4, 10 + i);
        else put(T, c, sp.x, sp.y + o, false, g.sw, 90 + (i - (n - 1) / 2) * (sp.d === 'r' ? -4 : 4), 10 + i);
      });
    });
  }
  const canPlay = T => T.me >= 0 && T.S.ph === 'play' && T.S.tu === T.me && !(T.S.gm === 'bc' && T.S.t.length >= T.S.p.length);
  // targhette dei giocatori: nome, punti o carte prese, turno, colore della coppia
  function plates(T, g) {
    const S = T.S, n = g.n;
    while (T.pl.length < n) { const d = document.createElement('div'); d.className = 'cnPl'; T.root.appendChild(d); T.pl.push(d); }
    S.p.forEach((_, s) => {
      const d = T.pl[s], k = g.rel(s), sp = g.spot(k), u = unit(n, s);
      let info = '';
      if (S.gm === 'bc') info = (S.ph === 'end' && S.pts ? '<b>' + S.pts[u] + '</b> punti' : S.w[u].length + ' carte prese');
      else info = '<b>' + S.tot[u] + '</b>' + (S.sc[u] ? ' · scope ' + S.sc[u] : '');
      d.className = 'cnPl' + (n === 4 ? ' t' + u : '') + (S.ph === 'play' && S.tu === s ? ' on' : '');
      d.innerHTML = (s === T.me ? 'Tu' : esc(S.n[s])) + '<br>' + info;
      const st = d.style; st.left = st.right = st.top = st.bottom = ''; st.transform = '';
      if (k === 0) { st.left = '8px'; st.bottom = (g.ch + 60) + 'px'; }
      else if (sp.d === 't') { st.left = (sp.x + Math.max(g.sw * 1.3, (S.h[s].length - 1) / 2 * g.sw * 0.55 + g.sw * 0.8)) + 'px'; st.top = '44px'; }
      else if (sp.d === 'r') { st.right = '6px'; st.top = (sp.y + g.H * 0.18 + 4) + 'px'; }
      else { st.left = '6px'; st.top = (sp.y + g.H * 0.18 + 4) + 'px'; }
    });
  }
  function fx(T, txt) {
    const f = T.root.querySelector('.cnFx'); f.textContent = txt; f.classList.add('on');
    clearTimeout(T.fxT); T.fxT = setTimeout(() => f.classList.remove('on'), 1100);
  }
  function render(T) {
    if (!T.root || !T.els) return;
    if (!window.CARTE) { bcLoad().then(() => render(T)).catch(() => {}); return; }
    const S = T.S, g = geo(T); T.used = new Set();
    if (S.gm === 'bc') renderBc(T, g); else renderSc(T, g);
    for (const [c, e] of T.els) if (!T.used.has(c)) e.style.opacity = 0;
    plates(T, g);
    const mid = T.root.querySelector('.cnMid');
    mid.textContent = md(S).t + (S.gm === 'sc' ? ' · smazzata ' + S.hand : '') + (T.watch ? ' · ' + T.watch + (T.watch > 1 ? ' guardano' : ' guarda') : '');
    hint(T);
    tallyBox(T);
    endBox(T);
  }
  // ---- briscola ----
  function trickSpot(g, k) {
    const dx = g.cw * 0.78, dy = g.ch * 0.42;
    if (k === 0) return [g.W / 2, g.cy + dy, -3];
    if (g.n === 4) return [[0, 0], [g.W / 2 + dx, g.cy, 82], [g.W / 2, g.cy - dy, 4], [g.W / 2 - dx, g.cy, -84]][k];
    return [[0, 0], [g.W / 2 + dx, g.cy - dy * 0.55, 76], [g.W / 2 - dx, g.cy - dy * 0.55, -76]][k];
  }
  function renderBc(T, g) {
    const S = T.S;
    // presa appena fatta: le carte restano un attimo dove sono, poi volano al mucchio (la transizione le porta)
    if (S.lt && S.lt.id !== T.seenLt) { T.seenLt = S.lt.id; if (S.lt.w === T.me) fx(T, 'Prendi tu!'); beep(660, 0.06, 0.03); }
    // mazzo con la briscola sotto, scoperta e girata
    const dx = g.deck.x, dy = g.deck.y;
    if (S.d.length) {
      put(T, S.bc, dx + g.cw * 0.42, dy, true, g.cw * 0.82, 90, 1);
      S.d.forEach((c, i) => { if (c === S.bc) return; const k = Math.min(S.d.length - 1 - i, 6); put(T, c, dx - k * 0.5, dy - k * 0.5, false, g.cw * 0.82, 0, 2 + k, S.d.length - 1 - i > 6 ? 0 : 1); });
    }
    cnt(T, 'deck', S.d.length ? S.d.length + ' nel mazzo · briscola ' + SUIT[S.b] : 'Mazzo finito · briscola ' + SUIT[S.b], dx, dy + g.ch * 0.52);
    S.t.forEach(([s, c], i) => { const [x, y, r] = trickSpot(g, g.rel(s)); put(T, c, x, y, true, g.cw, r, 20 + i); });
    hands(T, g);
    S.w.forEach((cards, u) => pile(T, g, u, cards));
  }
  function cnt(T, id, txt, x, y) {
    let e = T.root.querySelector('.cnCnt[data-id="' + id + '"]');
    if (!e) { e = document.createElement('div'); e.className = 'cnCnt'; e.dataset.id = id; T.root.appendChild(e); }
    e.textContent = txt; e.style.left = x + 'px'; e.style.top = y + 'px';
  }
  // ---- scopa ----
  function renderSc(T, g) {
    const S = T.S, mv = S.mv;
    // presa appena fatta: la carta giocata si appoggia sulle carte prese (che si illuminano), poi vanno al mucchio
    if (mv && mv.id !== T.seenMv) {
      T.seenMv = mv.id;
      if (mv.take.length) {
        T.land = mv; clearTimeout(T.landT); T.landT = setTimeout(() => { T.land = null; render(T); }, 800);
        beep(520, 0.05, 0.03);
        if (mv.scopa) { fx(T, 'SCOPA!'); [0, 4, 7].forEach((k, i) => beep(660 * Math.pow(2, k / 12), 0.12, 0.04, i * 0.08, 'triangle')); }
      } else beep(330, 0.04, 0.02);
    }
    const land = T.land, skip = new Set(land ? [land.c, ...land.take, ...(land.rest || [])] : []);
    const tb = land ? S.tb.concat(land.take, land.rest || []).filter((c, i, a) => a.indexOf(c) === i) : S.tb.slice();
    const myOpts = T.sel && canPlay(T) ? E.options(S.tb, T.sel) : [], glow = new Set(myOpts.flat());
    // tavola: righe centrate tra i giocatori ai lati
    const gap = 6, tw = g.W - (g.n >= 3 ? g.sh * 2 + 40 : 20), cols = Math.max(2, Math.floor((tw + gap) / (g.cw + gap))), rows = Math.ceil(tb.length / cols) || 1;
    const y0 = g.cy - (rows * g.ch + (rows - 1) * gap) / 2 + g.ch / 2;
    tb.forEach((c, i) => {
      const row = Math.floor(i / cols), rn = Math.min(cols, tb.length - row * cols), x = g.W / 2 + ((i % cols) - (rn - 1) / 2) * (g.cw + gap), y = y0 + row * (g.ch + gap);
      const e = put(T, c, x, y, true, g.cw, 0, 2 + i);
      if (glow.has(c) || (land && land.take.includes(c))) e.classList.add('glow');
      if (land && c === land.take[0]) put(T, land.c, x + g.cw * 0.28, y + g.ch * 0.18, true, g.cw, 8, 40).classList.add('glow');
    });
    hands(T, g);
    S.pl.forEach((cards, u) => pile(T, g, u, cards, land ? skip : null));
    S.d.forEach((c, i) => { const k = Math.min(S.d.length - 1 - i, 6); put(T, c, g.deck.x - k * 0.5, g.deck.y - k * 0.5, false, g.cw * 0.82, 0, 2 + k, S.d.length - 1 - i > 6 ? 0 : 1); });
    cnt(T, 'deck', S.d.length ? S.d.length + ' nel mazzo' : '', g.deck.x, g.deck.y + g.ch * 0.45);
    // scelta della presa
    const op = T.root.querySelector('.cnOpts');
    if (T.sel && canPlay(T)) {
      op.style.bottom = (g.ch + 70) + 'px';
      const sh = c => (val(c) === 1 ? 'A' : val(c) <= 7 ? val(c) : ['F', 'C', 'R'][val(c) - 8]) + ' ' + SUIT[su(c)];
      op.innerHTML = myOpts.length ? myOpts.map((gr, o) => `<button type="button" data-o="${o}">Prendi ${gr.map(sh).join(' + ')}</button>`).join('') : '<button type="button" class="put" data-o="-1">Metti in tavola</button>';
      op.querySelectorAll('button').forEach(b => { b.onclick = () => play(T, T.sel, +b.dataset.o); });
    } else op.innerHTML = '';
  }
  function tap(T, code) {
    const S = T.S; if (!canPlay(T) || !S.h[T.me].includes(code)) { if (T.me >= 0 && S.h[T.me] && S.h[T.me].includes(code)) { const e = T.els.get(code); e.animate([{ translate: '0' }, { translate: '4px 0' }, { translate: '-4px 0' }, { translate: '0' }], 260); } return; }
    if (S.gm === 'bc') { cn.act({ k: 'play', c: code }); return; }
    if (T.sel === code) { const o = E.options(S.tb, code); if (o.length <= 1) { play(T, code, o.length ? 0 : -1); return; } }
    T.sel = T.sel === code ? null : code; render(T);
  }
  function play(T, c, o) { T.sel = null; cn.act({ k: 'play', c, o }); }
  function hint(T) {
    const S = T.S, h = T.root.querySelector('.tvHint'), who = S.tu >= 0 ? esc(S.n[S.tu]) : '';
    if (S.ph !== 'play') { h.innerHTML = ''; return; }
    if (S.gm === 'bc' && S.t.length >= S.p.length) { const w = E.bcWinner(S); h.innerHTML = w === T.me ? 'Prendi tu.' : 'Prende ' + esc(S.n[w]) + '.'; return; }
    if (canPlay(T)) h.innerHTML = S.gm === 'bc' ? 'Tocca a te: tocca una carta per giocarla.' : T.sel ? (E.options(S.tb, T.sel).length > 1 ? 'Questa carta prende in più modi: scegli quale presa.' : 'Tocca il pulsante, o di nuovo la carta, per giocarla.') : 'Tocca a te: tocca una carta, le prese si illuminano.';
    else h.innerHTML = 'Gioca ' + who + '…';
  }
  function scoreTable(S, rows, me) {
    const U = nUnits(S.p.length), head = '<tr><th></th>' + Array.from({ length: U }, (_, u) => '<th>' + esc(unitName(S, u, me)) + '</th>').join('') + '</tr>';
    return '<table>' + head + rows.map(([nme, vals, w]) => '<tr><td style="text-align:left">' + nme + '</td>' + vals.map((v, u) => '<td class="' + (w === u ? 'w' : '') + '">' + v + '</td>').join('') + '</tr>').join('') + '</table>';
  }
  function tallyBox(T) {
    const S = T.S, old = T.root.querySelector('.cnTally');
    if (S.gm !== 'sc' || S.ph !== 'tally' || !S.tl) { if (old) old.remove(); return; }
    const key = S.hand + ':' + S.ok.join('') + ':' + T.me; if (old && old.dataset.k === key) return; if (old) old.remove();
    const e = document.createElement('div'); e.className = 'cnTally'; e.dataset.k = key;
    const rows = S.tl.rows.concat([['Totale', S.tot.slice(), -2]]), mine = T.me >= 0 && S.ok[T.me];
    const wait = S.n.filter((_, i) => !S.ok[i] && i !== T.me).map(esc).join(', ');
    e.innerHTML = '<h2>Fine della smazzata ' + S.hand + '</h2>' + scoreTable(S, rows, T.me) + '<p style="margin:2px 0;font-size:13px">Si vince a 11.</p>'
      + (T.me >= 0 ? `<button type="button"${mine ? ' disabled' : ''}>${mine ? 'Aspetto ' + wait + '…' : 'Avanti'}</button>` : '');
    const b = e.querySelector('button'); if (b) b.onclick = () => cn.act({ k: 'ok' });
    T.root.appendChild(e);
  }
  function endBox(T) {
    const S = T.S; if (S.ph !== 'end') { cn.endBox('', ''); return; }
    const n = S.p.length, me = T.me;
    let title = 'Pareggio!';
    if (S.win != null && S.win >= 0) { const m = members(n, S.win); title = me >= 0 && m.includes(me) ? (m.length > 1 ? 'Avete vinto!' : 'Hai vinto!') : (m.length > 1 ? 'Vincono ' : 'Vince ') + m.map(i => esc(S.n[i])).join(' e ') + '!'; }
    let score = '';
    if (S.quit == null) score = S.gm === 'bc' ? scoreTable(S, [['Punti', S.pts || [], S.win]], me) : scoreTable(S, (S.tl ? S.tl.rows : []).concat([['Totale', S.tot.slice(), S.win]]), me);
    cn.endBox(title, score);
  }

  // ---- tavolo a piu' posti ----
  const cn = cqTableN({
    id: 'cn', title: 'Carte al tavolino',
    rule: S => md(S).r,
    newMatch: S0 => {
      const m = md(S0), base = { p: S0.p, o: S0.o, dl: S0.dl };
      return m.gm === 'bc' ? E.bcNew(base) : E.scNew(base);
    },
    act: (T, seat, a) => {
      const S = T.S;
      if (S.gm === 'bc') return a.k === 'play' && E.bcPlay(S, seat, a.c);
      if (a.k === 'ok') return E.scOk(S, seat);
      return a.k === 'play' && E.scPlay(S, seat, a.c, a.o);
    },
    auto: S => S.gm === 'bc' && S.ph === 'play' && S.t.length >= S.p.length ? 1500 : 0,
    step: T => E.bcResolve(T.S),
    view, render,
    drop: T => { clearTimeout(T.fxT); clearTimeout(T.landT); if (T.ro) window.removeEventListener('resize', T.ro); },
  });
  // ---- scelta di chi gioca (dal pulsante del tavolino di briscola.js): servono n-1 amici seduti e liberi ----
  function pickSeated(mode) {
    const m = MODES[mode], G = cq.g, N = cq.net; if (!m || !G || !N) return;
    const busy = new Set(); cn.games().forEach(x => x.S.p.forEach(p => busy.add(p)));
    if (window.BC && BC.L && BC.L.tabs) { /* chi gioca gia' a briscola in 2 non e' libero: lo dice la sua lista */ }
    const fr = G.chars.filter(c => c.remote && c.alive && c.sit != null && !busy.has(c.sid));
    const need = m.n - 1;
    if (fr.length < need) { cn.modal(`<h2>${m.t}</h2><p>Servono ${need} amici seduti al tavolino: ${fr.length ? 'ora ce n\'è ' + (fr.length === 1 ? 'uno solo' : fr.length) : 'ora non c\'è nessuno'}. Invita qualcuno a sedersi in salotto!</p><button type="button" data-k="x">Ok</button>`); return; }
    const sel = [];
    const draw = () => {
      const list = fr.map((c, i) => `<button type="button" data-k="f${i}"${sel.includes(i) ? ' class="pr"' : ''}>${sel.includes(i) ? '✔ ' : ''}${esc(c.name)}</button>`).join('');
      cn.modal(`<h2>${m.t}</h2><p>Scegli ${need === 1 ? 'chi gioca' : need + ' amici'} (${sel.length} di ${need}).</p>${list}<button type="button" data-k="go" class="pr"${sel.length === need ? '' : ' disabled'}>Avanti</button><button type="button" data-k="x">Annulla</button>`, k => {
        if (k[0] === 'f') { const i = +k.slice(1), j = sel.indexOf(i); if (j >= 0) sel.splice(j, 1); else if (sel.length < need) sel.push(i); draw(); }
        else if (k === 'go') partner(sel.map(i => fr[i]));
      });
    };
    const partner = list => {
      if (m.n !== 4) return start(list);
      cn.modal(`<h2>${m.t}</h2><p>Chi è il tuo compagno? Gli altri due fanno coppia contro di voi.</p>${list.map((c, i) => `<button type="button" data-k="p${i}">${esc(c.name)}</button>`).join('')}<button type="button" data-k="x">Annulla</button>`, k => {
        if (k[0] !== 'p') return; const p = list[+k.slice(1)], o = list.filter(c => c !== p);
        start([o[0], p, o[1]]);   // posti: io 0, avversario 1, compagno 2 (di fronte), avversario 3
      });
    };
    const start = list => bcLoad().then(() => cn.open({ m: mode, v: m.v }, list)).catch(() => cqToast('Non riesco a caricare le carte: controlla la connessione e riprova.'));
    draw();
  }
  // pulsante "Guarda le carte" vicino al salotto quando c'e' un tavolo in 3 o 4
  const baseTick = cn.tick; let wt = 0;
  cn.tick = (G, dt) => {
    baseTick(G, dt);
    if ((wt -= dt) > 0) return; wt = 0.3;
    const box = document.getElementById('ciack'); if (!box) return;
    let b = document.getElementById('cnWatchB');
    if (!b) { b = document.createElement('button'); b.id = 'cnWatchB'; b.className = 'btn tvHallB'; b.type = 'button'; b.hidden = true; b.textContent = 'Guarda le carte'; b.style.bottom = '356px'; box.appendChild(b); }
    const N = cq.net, gs = cn.games().filter(x => !x.S.p.includes(N && N.sid)), near = typeof CQ_SALA !== 'undefined' && cq.map === 'hotel' && Math.hypot(cq.x - CQ_SALA.x, cq.y - CQ_SALA.y) < 4.2;
    const show = !!(G && G.hall && near && gs.length && !cn.T && cq.sit == null && cqHallFree());
    if (b.hidden === show) b.hidden = !show;
    b.onclick = () => { const x = gs[0]; if (x) bcLoad().then(() => cn.watch(x.key)).catch(() => {}); };
  };
  window.CN = Object.assign(cn, { E, MODES, pickSeated });
})();
