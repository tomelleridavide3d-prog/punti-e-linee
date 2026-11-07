// ==== TAVOLO A PIU' POSTI NELLA HALL (modulo comune, 07-11-2026): da 2 a 8 giocatori VERI (niente computer), banco = chi apre ====
// Generalizza giochi/lib/tavolo.js (che resta solo a 2). Chi apre fa da banco e scrive lo stato in cq/<set>/<id>/<sid del banco>/s {m: JSON, ts};
// gli altri mandano le mosse in .../a ({s, m}); chi guarda si segna in .../w/<sid>. Prima usato da giochi/carteN.js (Briscola e Scopa a 3 e 4);
// pensato anche per il Poker e la Valle dei Clan online.
// Uso: const X = cqTableN({ id, title, newMatch(S0) (stato di una partita nuova: S0 ha p, n, o, g), act(T, seat, a) (sul banco: cambia T.S, true = da pubblicare),
//   auto(S) (sul banco: ms prima di un passo automatico, o 0), step(T) (il passo automatico), view(T), render(T), drop(T), rule(S) (testo della sfida) });
// X.open(o, amici) apre il tavolo e invita gli amici (in ordine di posto: io sono il posto 0); X.act(a) le mie mosse; X.watch(key); X.endBox(html, chi vince).
// Stato comune: S = { ph 'inv'|'play'|'end' (piu' quelli del gioco), p [sid], n [nomi], o opzioni, ok [chi ha accettato], ts0, g partita, v versione,
//   rv [rivincita], quit posto di chi se n'e' andato, win (lo decide il gioco), why }.
window.cqTableN = cfg => {
  let T = null;
  const L = { un: [], N: null, tabs: {}, ms: {}, asked: {}, acc: {}, inv: null, gone: {} };
  const P = (N, k) => `cq/${N.code}/${cfg.id}/${k}`;
  const myName = () => String(store.settings.myName || 'Io').slice(0, 14);
  function publish() { const N = cq.net; if (N && T && T.key) cqNetPut(P(N, T.key) + '/s', { m: JSON.stringify(T.S), ts: Date.now() }); }
  function send(a) { const N = cq.net; if (N && T && T.key) N.F.push(cqNetRef(P(N, T.key) + '/a'), { s: N.sid, m: JSON.stringify(a) }).catch(() => {}); }
  function commit() {
    if (!T) return;
    T.S.v = (T.S.v || 0) + 1; publish(); cfg.render(T);
    if (T.host && cfg.auto) {
      clearTimeout(T.at); const d = cfg.auto(T.S), tok = T, v = T.S.v;
      if (d) T.at = setTimeout(() => { if (T === tok && T.S.v === v) { cfg.step(T); commit(); } }, d);
    }
  }
  const fresh = S0 => Object.assign(cfg.newMatch(S0), { p: S0.p, n: S0.n, o: S0.o, ts0: S0.ts0, ph: 'play', g: (S0.g || 0) + 1, rv: S0.p.map(() => 0), v: S0.v || 0, ok: S0.p.map(() => 1) });
  function hostAct(seat, a) {
    const S = T.S;
    if (a.k === 'rv') { if (S.ph !== 'end' || S.quit != null) return; S.rv[seat] = 1; if (S.rv.every(x => x)) T.S = fresh(S); commit(); return; }
    if (cfg.act(T, seat, a)) commit();
  }
  function act(a) { if (!T || T.me < 0) return; if (T.host) hostAct(T.me, a); else { if (cfg.guess) cfg.guess(T, a); send(a); } }
  // il gioco finisce per tutti quando uno se ne va (in 3 o 4 non si puo' continuare senza di lui)
  function quit(seat, why) { const S = T.S; if (S.ph === 'end' && S.quit != null) return; S.ph = 'end'; S.quit = seat; S.win = null; S.why = why; commit(); }
  function view() {
    if (T.root) T.root.remove();
    const r = document.createElement('div'); r.className = 'tvRoot'; document.body.appendChild(r); T.root = r;
    cfg.view(T);
    const x = document.createElement('button'); x.className = 'tvX'; x.type = 'button'; x.textContent = 'Esci';
    x.onclick = () => { const S = T && T.S; if (S && S.ph !== 'end' && S.ph !== 'inv' && T.me >= 0 && !confirm('Lasci la partita a metà? Finisce per tutti.')) return; close(); };
    r.appendChild(x);
    cfg.render(T);
  }
  function open(o, fr) {
    const N = cq.net; if (!N || !fr.length) return;
    close();
    T = { key: N.sid, host: true, me: 0, S: { ph: 'inv', p: [N.sid, ...fr.map(c => c.sid)], n: [myName(), ...fr.map(c => String(c.name || 'Amico').slice(0, 14))], o, ok: [1, ...fr.map(() => 0)], ts0: Date.now(), v: 1 } };
    N.F.onDisconnect(cqNetRef(P(N, N.sid))).remove();
    publish(); waitBox();
    const tok = T;
    T.it = setTimeout(() => { if (T === tok && T.S.ph === 'inv') { const who = T.S.n.filter((_, i) => !T.S.ok[i]).map(esc).join(', '); modalClose(); close(); cqToast('<b>' + who + '</b> non ha risposto all\'invito.'); } }, 40000);
  }
  function waitBox() {
    if (!T || T.S.ph !== 'inv') return;
    const S = T.S, rows = S.n.map((n, i) => `<p>${S.ok[i] ? '✔' : '…'} ${esc(n)}${i === 0 ? ' (tu)' : ''}</p>`).join('');
    modal(`<h2>${cfg.title}</h2><p>${esc(cfg.rule(S))}</p>${rows}<button type="button" data-k="x">Annulla</button>`, k => { if (k === 'x' && T && T.S.ph === 'inv') close(); });
  }
  function hostMsg(from, a) {
    if (!T || !T.host || !T.key) return;
    const S = T.S, seat = S.p.indexOf(from); if (seat < 0) return;
    if (S.ph === 'inv') {
      if (a.k === 'ok') { S.ok[seat] = 1; if (S.ok.every(x => x)) { clearTimeout(T.it); modalClose(); T.S = fresh(S); view(); commit(); } else { S.v++; publish(); waitBox(); } }
      else if (a.k === 'no') { const n = S.n[seat]; modalClose(); close(); cqToast('<b>' + esc(n) + '</b> ha detto di no. Sarà per un\'altra volta!'); }
      return;
    }
    if (a.k === 'bye') { if (S.ph === 'end') return; quit(seat, esc(S.n[seat]) + ' ha lasciato il tavolo.'); return; }
    hostAct(seat, a);
  }
  function watch(key) {
    const N = cq.net, t = L.tabs[key]; if (!N || !t || !t.s) return;
    const S = parse(key, t); if (!S) return;
    close();
    T = { key, host: false, me: -1, S: JSON.parse(t.s.m) };
    N.F.set(cqNetRef(P(N, key) + '/w/' + N.sid), 1).catch(() => {});
    N.F.onDisconnect(cqNetRef(P(N, key) + '/w/' + N.sid)).remove();
    view();
  }
  function close() {
    if (!T || T.closing) return;
    T.closing = 1; clearTimeout(T.at); clearTimeout(T.it);
    try { cfg.drop && cfg.drop(T); } catch {}
    if (T.root) T.root.remove();
    const N = cq.net;
    if (N && T.key) {
      if (T.host) {
        if (T.S.ph === 'play' || (T.S.ph !== 'inv' && T.S.ph !== 'end')) { T.S.ph = 'end'; T.S.quit = 0; T.S.why = esc(T.S.n[0]) + ' ha lasciato il tavolo.'; T.S.v++; publish(); }
        const key = T.key; setTimeout(() => { if (cq.net === N && (!T || T.key !== key)) N.F.remove(cqNetRef(P(N, key))).catch(() => {}); }, T.S.ph === 'inv' ? 0 : 5000);
      }
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
    for (const [k, t] of Object.entries(L.tabs)) { const S = parse(k, t); if (S && S.p && S.ph !== 'inv' && !(S.ph === 'end' && S.quit != null) && n - (t.s.ts || 0) < 15 * 60000) out.push({ key: k, S, t }); }
    return out;
  }
  function onTabs() {
    const N = cq.net; if (!N) return;
    for (const [key, t] of Object.entries(L.tabs)) {
      const S = parse(key, t); if (!S || !S.p) continue;
      const seat = S.p.indexOf(N.sid);
      if (S.ph === 'inv' && seat > 0 && !L.asked[key + ':' + S.ts0] && Date.now() - (t.s.ts || 0) < 40000) {
        L.asked[key + ':' + S.ts0] = 1; L.inv = key;
        beep(880, 0.08, 0.04); beep(1175, 0.12, 0.04, 0.1);
        const others = S.n.filter((_, i) => i !== seat && i !== 0).map(esc).join(', ');
        modal(`<h2>${cfg.title}</h2><p><b>${esc(S.n[0])}</b> ti invita a giocare: ${esc(cfg.rule(S))}.</p>${others ? '<p>Al tavolo anche: ' + others + '.</p>' : ''}<button class="pr" type="button" data-k="ok">Accetta</button><button type="button" data-k="no">No</button>`, k => {
          L.inv = null; L.acc[key] = k === 'ok' ? S.ts0 : 0;
          N.F.push(cqNetRef(P(N, key) + '/a'), { s: N.sid, m: JSON.stringify({ k }) }).catch(() => {});
          if (k === 'ok') modal(`<h2>${cfg.title}</h2><p>Aspetto gli altri…</p>`, null);
        });
      }
      if (S.ph !== 'inv' && seat > 0 && L.acc[key] && L.acc[key] === S.ts0 && (!T || T.key !== key)) { L.acc[key] = 0; modalClose(); close(); T = { key, host: false, me: seat, S }; view(); }
    }
    if (L.inv && (!L.tabs[L.inv] || (parse(L.inv, L.tabs[L.inv]) || {}).ph !== 'inv')) { L.inv = null; modalClose(); }
    for (const k of Object.keys(L.acc)) if (L.acc[k] && !L.tabs[k]) { L.acc[k] = 0; modalClose(); }   // invito annullato mentre aspettavo
    if (T && T.key && !T.host) {
      const S = parse(T.key, L.tabs[T.key]);
      if (!S) { const n = T.S && T.S.n ? T.S.n[0] : '', ended = T.S && T.S.ph === 'end'; close(); if (n && !ended) cqToast('Il tavolo di <b>' + esc(n) + '</b> si è chiuso.'); return; }
      if (S.v !== T.S.v) { T.S = JSON.parse(JSON.stringify(S)); cfg.render(T); }
    }
    if (T && T.key) { const t = L.tabs[T.key]; T.watch = t && t.w ? Object.keys(t.w).length : 0; }
  }
  // ---- hall: il banco controlla che tutti siano ancora nel party (sparito da 15 s = ha lasciato) ----
  let gt = 0;
  function tick(G, dt) {
    if (L.N !== cq.net) resub();
    if ((gt -= dt) > 0) return; gt = 1;
    if (!T || !T.host || !T.key || T.S.ph === 'end' || T.S.ph === 'inv' || !cq.g) return;
    const now = Date.now();
    T.S.p.forEach((sid, i) => {
      if (!i) return;
      const here = cq.g.chars.some(c => c.remote && c.sid === sid);
      if (here) delete L.gone[sid]; else if (!L.gone[sid]) L.gone[sid] = now; else if (now - L.gone[sid] > 15000) { delete L.gone[sid]; quit(i, esc(T.S.n[i]) + ' è uscito dal party.'); }
    });
  }
  const busy = () => !!(T && T.me >= 0 && T.S && T.S.ph !== 'end');
  function modal(html, then) {
    modalClose();
    const m = document.createElement('div'); m.id = 'tvModal'; m.innerHTML = `<div class="tvBox">${html}</div>`;
    document.body.appendChild(m);
    m.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { modalClose(); then && then(b.dataset.k); }; });
  }
  function modalClose() { const m = document.getElementById('tvModal'); if (m) m.remove(); }
  // fine partita (riquadro comune): title, punteggio, rivincita (servono tutti), torna nella hall
  function endBox(title, score) {
    const S = T.S, old = T.root.querySelector('.tvEnd');
    if (S.ph !== 'end') { if (old) old.remove(); return; }
    const key = S.g + ':' + (S.rv || []).join('') + ':' + (S.quit == null ? '' : S.quit) + ':' + T.me; if (old && old.dataset.g === key) return; if (old) old.remove();
    const me = T.me;
    if (me >= 0 && T.endG !== S.g && S.quit == null) { T.endG = S.g; if (S.winMe && S.winMe.includes(me)) [0, 4, 7, 12].forEach((n, i) => beep(523 * Math.pow(2, n / 12), 0.2, 0.05, i * 0.1, 'triangle')); }
    const wait = S.rv ? S.n.filter((_, i) => !S.rv[i] && i !== me) : [], mine = me >= 0 && S.rv && S.rv[me];
    const e = document.createElement('div'); e.className = 'tvEnd'; e.dataset.g = key;
    e.innerHTML = `<h2>${S.quit != null ? 'Partita interrotta' : title}</h2>${score ? '<div>' + score + '</div>' : ''}${S.why ? '<p>' + S.why + '</p>' : ''}`
      + (me >= 0 && S.quit == null ? `<button type="button" data-k="rv"${mine ? ' disabled' : ''}>${mine ? 'Aspetto ' + wait.map(esc).join(', ') + '…' : 'Rivincita'}</button>` : '') + `<button type="button" class="no" data-k="x">Torna nella hall</button>`;
    e.querySelectorAll('button').forEach(bt => { bt.onclick = () => { if (bt.dataset.k === 'rv') act({ k: 'rv' }); else close(); }; });
    T.root.appendChild(e);
  }
  // solo per le prove (prove/cn2.js): tavolo sul mio telefono senza rete, T.me si puo' cambiare per giocare al posto di tutti
  function local(o, names) { close(); T = { key: null, host: true, me: 0, S: { p: names.map((_, i) => 'L' + i), n: names, o, ts0: Date.now(), v: 0 } }; T.S = fresh(T.S); view(); commit(); }
  return { tick, busy, open, watch, close, act, commit, endBox, games, modal, local, get T() { return T; }, L };
};
