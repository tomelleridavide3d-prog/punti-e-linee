// ==== TAVOLO A DUE NELLA HALL (modulo comune, 23-10-2026): sfide, partita col banco, spettatori, rivincita, pulsante vicino al tavolo ====
// Stesso schema delle freccette (giochi/freccette.js) e della Briscola: chi sfida fa da banco e scrive lo stato in cq/<set>/<id>/<sid del banco>/s
// {m: JSON, ts}; l'avversario manda le mosse in .../a; chi guarda si segna in .../w. Contro il computer lo stato gira solo sul mio telefono.
// Uso: const X = cqTable({ id, title, emoji, aiName, near(), newMatch(S0), act(T, seat, a) (sul banco: cambia T.S, true = da pubblicare),
//   aiTurn(T) (sul banco, tocca al computer: azione o null), aiDelay, view(T) (crea la visuale in T.root), render(T) (stato nuovo), drop(T) (chiusura), btnCss });
// Il gioco chiama X.commit() dopo aver cambiato T.S da solo, X.act(a) per le mie mosse. Ganci nel motore: X.tick (cqHallTick), X.busy (cqHallReady).
window.cqTable = cfg => {
  let T = null;
  const L = { un: [], N: null, tabs: {}, ms: {}, asked: {}, acc: {}, inv: null, uiT: 0 };
  const P = (N, k) => `cq/${N.code}/${cfg.id}/${k}`;
  const myName = () => String(store.settings.myName || 'Io').slice(0, 14);
  function publish() { const N = cq.net; if (N && T && T.key) cqNetPut(P(N, T.key) + '/s', { m: JSON.stringify(T.S), ts: Date.now() }); }
  function send(a) { const N = cq.net; if (N && T && T.key) N.F.push(cqNetRef(P(N, T.key) + '/a'), { s: N.sid, m: JSON.stringify(a) }).catch(() => {}); }
  // posta (cfg.bets, 23-10-2026): S.bet monete a testa, si pagano all'inizio di ogni partita (anche la rivincita) sul proprio telefono;
  // chi vince prende il doppio, pareggio = torna la posta, chi esce a meta' la perde (all'altro il doppio), amico sparito = torna la posta
  function settle(T) {
    const S = T.S; if (!S.bet || T.me < 0 || T.paidG === S.g || S.ph !== 'play') return;
    T.paidG = S.g; cqCoins(-S.bet); cqToast('🪙 Posta: <b>' + S.bet + ' monete</b>. Chi vince ne prende ' + 2 * S.bet + '!');
  }
  function render(T) { settle(T); cfg.render(T); }
  const oppGone = () => { const S = T.S, o = S.p[1 - T.me]; return S.ai < 0 && !!cq.net && !(cq.g && cq.g.chars.some(c => c.remote && c.sid === o)); };
  function commit() {
    if (!T) return;
    T.S.v = (T.S.v || 0) + 1; publish(); render(T);
    const tok = T;
    if (T.S.ph === 'play' && T.S.ai >= 0 && cfg.aiTurn) {
      clearTimeout(T.at);
      T.at = setTimeout(() => { if (T !== tok || T.S.ph !== 'play') return; const a = cfg.aiTurn(T); if (a) hostAct(T.S.ai, a); }, typeof cfg.aiDelay === 'function' ? cfg.aiDelay(T) : cfg.aiDelay || 1200);
    }
  }
  function hostAct(seat, a) {
    const S = T.S;
    if (a.k === 'rv') { if (S.ph !== 'end') return; S.rv = S.rv || [0, 0]; S.rv[seat] = 1; if (S.ai >= 0) S.rv[S.ai] = 1; if (S.rv[0] && S.rv[1]) T.S = fresh(S); commit(); return; }
    if (cfg.act(T, seat, a)) commit();
  }
  const fresh = S0 => Object.assign(cfg.newMatch(S0), { p: S0.p, n: S0.n, ai: S0.ai, ts0: S0.ts0, bet: S0.bet || 0, ph: 'play', g: (S0.g || 0) + 1, rv: [0, 0], v: S0.v || 0, f: S0.f == null ? 0 : 1 - S0.f });
  function act(a) { if (!T) return; if (T.host) hostAct(T.me, a); else send(a); }
  function open() {
    if (T.root) T.root.remove();
    const r = document.createElement('div'); r.className = 'tvRoot'; document.body.appendChild(r); T.root = r;
    cfg.view(T);
    const x = document.createElement('button'); x.className = 'tvX'; x.type = 'button'; x.textContent = '✕ Esci';
    x.onclick = () => {
      const S = T && T.S;
      if (S && S.ph === 'play' && T.me >= 0) {
        const gone = oppGone();
        if (!confirm(S.bet && !gone ? 'Se esci perdi la posta (' + S.bet + ' 🪙). Esci lo stesso?' : 'Lasci la partita a metà?')) return;
        if (S.bet && gone && T.paidG === S.g) { cqCoins(S.bet); T.paidG = -1; cqToast('🪙 ' + esc(S.n[1 - T.me]) + ' non c\'è più: ti torna la posta.'); }
        else if (S.bet && T.host && S.ai < 0) forfeit();
      }
      close();
    };
    r.appendChild(x);
    render(T);
  }
  // il banco esce a meta' con la posta: l'amico vince (stato di fine pubblicato, il tavolo si toglie dopo 6 s per dargli il tempo di vederlo)
  function forfeit() {
    const S = T.S, N = cq.net; S.ph = 'end'; S.win = 1 - T.me; S.quit = 1; S.why = '🏃 ' + esc(S.n[T.me]) + ' ha lasciato la partita: la posta è tua.'; S.v = (S.v || 0) + 1; publish();
    const key = T.key; T.keepRm = 1;
    setTimeout(() => { if (cq.net === N && (!T || T.key !== key)) N.F.remove(cqNetRef(P(N, key))).catch(() => {}); }, 6000);
  }
  function startAI(bet) {
    close(); const N = cq.net;
    T = { key: N ? N.sid : null, host: true, me: 0, S: { p: [N ? N.sid : null, null], n: [myName(), cfg.aiName], ai: 1, v: 0, bet: bet || 0 } };
    if (N) N.F.onDisconnect(cqNetRef(P(N, N.sid))).remove();
    T.S = fresh(Object.assign(T.S, { f: 1 })); open(); commit();
  }
  function challenge(c, bet) {
    const N = cq.net; if (!N) return;
    close();
    T = { key: N.sid, host: true, me: 0, S: { ph: 'inv', p: [N.sid, c.sid], n: [myName(), String(c.name || 'Amico').slice(0, 14)], ai: -1, v: 1, ts0: Date.now(), f: 1, bet: bet || 0 } };
    N.F.onDisconnect(cqNetRef(P(N, N.sid))).remove();
    publish();
    modal(`<h2>${cfg.emoji} Sfida a ${cfg.title}</h2><p>Aspetto la risposta di <b>${esc(T.S.n[1])}</b>…</p><button type="button" data-k="x">Annulla</button>`, k => { if (k === 'x' && T && T.S.ph === 'inv') close(); });
    const tok = T;
    T.it = setTimeout(() => { if (T === tok && T.S.ph === 'inv') { modalClose(); close(); cqToast(cfg.emoji + ' <b>' + esc(tok.S.n[1]) + '</b> non ha risposto alla sfida.'); } }, 30000);
  }
  function hostMsg(from, a) {
    if (!T || !T.host || !T.key) return;
    const S = T.S, seat = S.p.indexOf(from); if (seat < 0) return;
    if (S.ph === 'inv') {
      if (a.k === 'ok') { clearTimeout(T.it); modalClose(); T.S = fresh(S); open(); commit(); }
      else if (a.k === 'no' || a.k === 'poor') { const n = S.n[1]; modalClose(); close(); cqToast(cfg.emoji + ' <b>' + esc(n) + '</b> ' + (a.k === 'poor' ? 'non ha abbastanza monete per la posta (' + S.bet + ' 🪙).' : 'ha detto di no. Sarà per un\'altra volta!')); }
      return;
    }
    if (a.k === 'bye') {
      const n = S.n[seat];
      if (S.ph === 'play' && S.bet) { S.ph = 'end'; S.win = 1 - seat; S.quit = 1; S.why = '🏃 ' + esc(n) + ' ha lasciato la partita: la posta è tua.'; commit(); return; }
      close(); cqToast(cfg.emoji + ' <b>' + esc(n) + '</b> ha lasciato la partita.'); return;
    }
    hostAct(seat, a);
  }
  function watch(key) {
    const N = cq.net, t = L.tabs[key]; if (!N || !t || !t.s) return;
    close();
    T = { key, host: false, me: -1, S: JSON.parse(t.s.m) };
    N.F.set(cqNetRef(P(N, key) + '/w/' + N.sid), 1).catch(() => {});
    N.F.onDisconnect(cqNetRef(P(N, key) + '/w/' + N.sid)).remove();
    open();
  }
  function close() {
    if (!T || T.closing) return;
    T.closing = 1; try { window.cqCloseWhy = (window.cqCloseWhy || '') + ' | ' + new Error().stack.slice(0, 400); } catch {}   // closing: avvisare l'altro fa tornare qui (ascolto della rete): niente giri infiniti
    clearTimeout(T.at); clearTimeout(T.it);
    try { cfg.drop && cfg.drop(T); } catch {}
    if (T.root) T.root.remove();
    const N = cq.net;
    if (N && T.key) {
      if (T.host) { if (!T.keepRm) N.F.remove(cqNetRef(P(N, T.key))).catch(() => {}); }
      else if (T.me < 0) N.F.remove(cqNetRef(P(N, T.key) + '/w/' + N.sid)).catch(() => {});
      else send({ k: 'bye' });
    }
    T = null;
  }
  // ---- rete del party ----
  function resub() {
    for (const u of L.un) try { u(); } catch {}
    L.un = []; L.N = cq.net; L.tabs = {}; L.ms = {};
    const N = cq.net; if (!N) return;
    L.un.push(N.F.onValue(cqNetRef(`cq/${N.code}/${cfg.id}`), s => { if (cq.net === N) { L.tabs = s.val() || {}; onTabs(); } }));
    L.un.push(N.F.onChildAdded(cqNetRef(P(N, N.sid) + '/a'), sn => { const v = sn.val(); N.F.remove(sn.ref).catch(() => {}); try { hostMsg(v.s, JSON.parse(v.m)); } catch {} }));
  }
  const parse = (key, t) => { if (!t || !t.s || typeof t.s.m !== 'string') return null; const c = L.ms[key]; if (c && c.m === t.s.m) return c.S; try { const S = JSON.parse(t.s.m); L.ms[key] = { m: t.s.m, S }; return S; } catch { return null; } };
  function games() {
    const out = [], n = Date.now();
    for (const [k, t] of Object.entries(L.tabs)) { const S = parse(k, t); if (S && S.ph !== 'inv' && n - (t.s.ts || 0) < 15 * 60000) out.push({ key: k, S, t }); }
    return out;
  }
  function onTabs() {
    const N = cq.net; if (!N) return;
    for (const [key, t] of Object.entries(L.tabs)) {
      const S = parse(key, t); if (!S || !S.p) continue;
      if (S.ph === 'inv' && S.p[1] === N.sid && !L.asked[key + ':' + S.ts0] && Date.now() - (t.s.ts || 0) < 30000) {
        L.asked[key + ':' + S.ts0] = 1; L.inv = key;
        beep(880, 0.08, 0.04); beep(1175, 0.12, 0.04, 0.1);
        const c = cqBank().coins, poor = S.bet > 0 && c < S.bet;
        const bet = S.bet ? `<p>🪙 Posta: <b>${S.bet}</b> monete a testa, chi vince ne prende <b>${2 * S.bet}</b>.${poor ? ' Ma tu ne hai solo ' + c + '…' : ''}</p>` : '';
        modal(`<h2>${cfg.emoji} Sfida a ${cfg.title}!</h2><p><b>${esc(S.n[0])}</b> ti sfida a ${cfg.title}${cfg.rule ? ': ' + cfg.rule : ''}.</p>${bet}` + (poor ? '<button type="button" data-k="poor">😅 Non ho abbastanza monete</button>' : `<button class="pr" type="button" data-k="ok">✅ Accetta</button><button type="button" data-k="no">❌ No</button>`), k => {
          L.inv = null; L.acc[key] = k === 'ok' ? S.ts0 : 0;
          N.F.push(cqNetRef(P(N, key) + '/a'), { s: N.sid, m: JSON.stringify({ k }) }).catch(() => {});
        });
      }
      if (S.ph === 'play' && S.p[1] === N.sid && L.acc[key] && L.acc[key] === S.ts0 && (!T || T.key !== key)) { L.acc[key] = 0; close(); T = { key, host: false, me: 1, S }; open(); }
    }
    if (L.inv && (!L.tabs[L.inv] || (parse(L.inv, L.tabs[L.inv]) || {}).ph !== 'inv')) { L.inv = null; modalClose(); }
    if (T && T.key && !T.host) {
      const S = parse(T.key, L.tabs[T.key]);
      if (!S) {
        if (T.S.quit) { T.key = null; return; }   // il banco ha lasciato con la posta: resto sul riquadro della vittoria
        const n = T.S && T.S.n ? T.S.n[0] : '', back = T.S.bet && T.S.ph === 'play' && T.me >= 0 && T.paidG === T.S.g;
        if (back) { cqCoins(T.S.bet); T.paidG = -1; }
        close(); if (n) cqToast(cfg.emoji + ' La partita di <b>' + esc(n) + '</b> è finita.' + (back ? ' Ti torna la posta.' : '')); return;
      }
      if (S.v !== T.S.v) { T.S = JSON.parse(JSON.stringify(S)); render(T); }
    }
    if (T && T.key) { const t = L.tabs[T.key]; T.watch = t && t.w ? Object.keys(t.w).length : 0; T.raw = t; if (cfg.raw) cfg.raw(T, t); }
  }
  // ---- hall ----
  function tick(G, dt) {
    if (L.N !== cq.net) resub();
    if ((L.uiT -= dt) > 0) return; L.uiT = 0.15;
    const box = document.getElementById('ciack'); if (!box) return;
    let b = document.getElementById('tvB_' + cfg.id);
    if (!b) { b = document.createElement('button'); b.id = 'tvB_' + cfg.id; b.className = 'btn tvHallB'; b.type = 'button'; b.hidden = true; b.textContent = cfg.emoji + ' ' + cfg.title; b.onclick = pick; if (cfg.btnCss) b.style.cssText = cfg.btnCss; box.appendChild(b); }
    const on = !!(G && G.hall && G.me.alive && cqHallFree() && cq.sit == null && cfg.near() && !T && !document.getElementById('tvModal'));
    if (b.hidden === on) b.hidden = !on;
  }
  const busy = () => !!(T && T.me >= 0 && T.S && T.S.ph === 'play');
  function pick() {
    const G = cq.g; if (!G || !G.hall) return;
    const gs = games(), busyS = new Set(); gs.forEach(x => x.S.p.forEach(p => p && busyS.add(p)));
    const fr = cq.net ? G.chars.filter(c => c.remote && c.alive && !busyS.has(c.sid)) : [];
    const list = fr.map((c, i) => `<button type="button" data-k="f${i}">⚔️ Sfida ${esc(c.name)}</button>`).join('');
    const wl = gs.map((x, i) => `<button type="button" data-k="w${i}">👀 Guarda ${esc(x.S.n[0])} contro ${esc(x.S.n[1])}</button>`).join('');
    modal(`<h2>${cfg.emoji} ${cfg.title}</h2>${cfg.rule ? '<p>' + cfg.rule + '</p>' : ''}${list}<button type="button" data-k="ai">🎩 ${cfg.aiName} (computer)</button>${wl}<button type="button" data-k="x">Annulla</button>`, k => {
      if (k === 'ai') stake(cfg.aiName, startAI);
      else if (k[0] === 'f') { const c = fr[+k.slice(1)]; if (c) stake(c.name, b => challenge(c, b)); }
      else if (k[0] === 'w') { const x = gs[+k.slice(1)]; if (x) watch(x.key); }
    });
  }
  function stake(who, go) {   // quanto si gioca (solo i giochi con cfg.bets)
    if (!cfg.bets) return go(0);
    const c = cqBank().coins;
    modal(`<h2>${cfg.emoji} Quanto giochi?</h2><p>Contro <b>${esc(who || '?')}</b>: ognuno mette la posta e chi vince prende tutto. Se si pareggia non perde nessuno. Hai 🪙 <b>${c}</b>.</p>`
      + cfg.bets.map(b => b ? `<button type="button" data-k="b${b}"${b > c ? ' disabled' : ''}>🪙 ${b} → chi vince ne prende ${2 * b}</button>` : '<button class="pr" type="button" data-k="b0">🤝 Amichevole (+1 🪙 se vinci)</button>').join('')
      + '<button type="button" data-k="x">Annulla</button>', k => { if (k[0] === 'b') go(+k.slice(1)); });
  }
  function modal(html, then) {
    modalClose();
    const m = document.createElement('div'); m.id = 'tvModal'; m.innerHTML = `<div class="tvBox">${html}</div>`;
    document.body.appendChild(m);
    m.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { modalClose(); then && then(b.dataset.k); }; });
  }
  function modalClose() { const m = document.getElementById('tvModal'); if (m) m.remove(); }
  // fine partita (riquadro comune): titolo, punteggio, rivincita, torna nella hall
  function endBox(score) {
    const S = T.S, old = T.root.querySelector('.tvEnd');
    if (S.ph !== 'end') { if (old) old.remove(); return; }
    const key = S.g + ':' + (S.rv || []).join(''); if (old && old.dataset.g === key) return; if (old) old.remove();
    const me = T.me;
    const paid = S.bet && T.paidG === S.g;
    if (me >= 0 && T.endG !== S.g) {
      T.endG = S.g;
      if (S.win === me) { [0, 4, 7, 12].forEach((n, i) => beep(523 * Math.pow(2, n / 12), 0.2, 0.05, i * 0.1, 'triangle')); if (paid) { cqCoins(2 * S.bet); [0, 1, 2, 3, 4].forEach(i => beep(1760 + i * 220, 0.05, 0.03, 0.5 + i * 0.07, 'square')); } else if (!S.bet && cq.g && cq.g.hall) cqCoins(1); }
      else if (S.win === -1 && paid) cqCoins(S.bet);
    }
    const title = S.win === -1 ? '🤝 Pareggio!' : me < 0 ? '🏆 Vince ' + esc(S.n[S.win]) + '!' : S.win === me ? '🏆 Hai vinto!' : '😅 Ha vinto ' + esc(S.n[S.win]);
    const prize = me < 0 ? (S.bet ? 'In palio: ' + 2 * S.bet + ' 🪙' : '') : !S.bet ? (S.win === me ? '+1 🪙 per la vittoria' : '') : !paid ? '' : S.win === me ? '<b>+' + 2 * S.bet + ' 🪙</b>: la posta è tua!' : S.win === -1 ? 'Ti torna la posta (' + S.bet + ' 🪙)' : 'Hai perso la posta (' + S.bet + ' 🪙)';
    const waitRv = me >= 0 && S.rv && S.rv[me] && !S.rv[1 - me], poor = S.bet && cqBank().coins < S.bet;
    const e = document.createElement('div'); e.className = 'tvEnd'; e.dataset.g = key;
    e.innerHTML = `<h2>${title}</h2><p>${score || ''}</p>${S.why ? '<p>' + S.why + '</p>' : ''}${prize ? '<p>' + prize + '</p>' : ''}`
      + (me >= 0 && !S.quit ? `<button type="button" data-k="rv"${waitRv || poor ? ' disabled' : ''}>${poor ? 'Per la rivincita servono ' + S.bet + ' 🪙' : waitRv ? 'Aspetto ' + esc(S.n[1 - me]) + '…' : '🔁 Rivincita' + (S.bet ? ' · ' + S.bet + ' 🪙' : '')}</button>` : '') + `<button type="button" class="no" data-k="x">Torna nella hall</button>`;
    e.querySelectorAll('button').forEach(bt => { bt.onclick = () => { if (bt.dataset.k === 'rv') act({ k: 'rv' }); else close(); }; });
    T.root.appendChild(e);
  }
  if (!document.getElementById('tvCss')) {
    const css = document.createElement('style'); css.id = 'tvCss';
    css.textContent = `
.tvHallB{position:absolute;right:18px;bottom:244px;font-size:16px;font-weight:700;padding:11px 15px;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.35);background:linear-gradient(#3a6aa8,#23446e);color:#fff;border:2px solid #e0b84a}
#tvModal{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(10,8,16,.55)}
#tvModal .tvBox{background:#2a1e18;color:#f4ead2;border:3px solid #c99a44;border-radius:16px;padding:16px;width:min(340px,90vw);max-height:86vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.6);font-family:system-ui,sans-serif}
#tvModal h2{margin:0 0 6px;font-size:20px}#tvModal p{margin:4px 0 10px;font-size:14px}
#tvModal button{display:block;width:100%;margin:6px 0;padding:10px;border-radius:10px;border:2px solid #6a4a2a;background:#4a3020;color:#fff;font-weight:700;font-size:15px}
#tvModal button.pr{background:#3e8a4a;border-color:#e0b84a}#tvModal button:disabled,.tvEnd button:disabled{opacity:.45}
.tvRoot{position:fixed;inset:0;z-index:55;background:#14100e;touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,sans-serif;overflow:hidden}
.tvRoot canvas{position:absolute;inset:0;width:100%;height:100%}
.tvX{position:absolute;right:10px;bottom:12px;background:rgba(20,16,14,.85);color:#fff;border:2px solid #6a4a2a;border-radius:12px;padding:8px 12px;font-weight:700;font-size:14px;z-index:3}
.tvTop{position:absolute;left:8px;right:8px;top:8px;display:flex;gap:6px;align-items:stretch;pointer-events:none;z-index:2}
.tvTop .pl{flex:1;background:rgba(20,16,14,.82);border:2px solid #6a4a2a;border-radius:12px;padding:5px 8px;color:#f4ead2;font-size:13px;line-height:1.25}
.tvTop .pl.on{border-color:#e0b84a;box-shadow:0 0 12px rgba(224,184,74,.6)}
.tvTop .pl b{font-size:20px}.tvTop .mid{background:rgba(20,16,14,.82);border:2px solid #6a4a2a;border-radius:12px;color:#e0b84a;font-weight:800;padding:5px 8px;text-align:center;font-size:12px;min-width:50px}
.tvHint{position:absolute;left:10px;right:110px;bottom:12px;color:#f4ead2;font-size:14px;font-weight:600;text-shadow:0 1px 4px #000;pointer-events:none;z-index:2}
.tvEnd{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#2a1e18;color:#f4ead2;border:3px solid #c99a44;border-radius:16px;padding:18px;width:min(320px,88vw);text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.7);z-index:4}
.tvEnd h2{margin:0 0 8px;font-size:24px}.tvEnd button{display:block;width:100%;margin:8px 0 0;padding:11px;border-radius:10px;border:2px solid #e0b84a;background:#3e8a4a;color:#fff;font-weight:800;font-size:16px}.tvEnd button.no{background:#4a3020;border-color:#6a4a2a}`;
    document.head.appendChild(css);
  }
  return { tick, busy, pick, startAI, challenge, watch, close, act, commit, endBox, games, get T() { return T; }, L };
};
