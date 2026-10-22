// Infezione (acchiapparello zombie) e la sua variante Bomba a orologeria. Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Zombie: chi viene toccato da uno zombie diventa zombie; vince chi resiste fino alla fine del tempo (se tutti diventano zombie vincono gli zombie).
// Bomba: chi ha la bomba la passa toccando qualcuno; quando scade esplode in mano a chi ce l'ha, che esce; l'ultimo rimasto vince.
(() => {
  const TOUCH = 0.75, WAKE = 5;   // distanza del tocco (in caselle); secondi in cui gli zombie restano fermi all'inizio
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const alive = G => G.chars.filter(c => c.alive);
  const near = (a, b) => { const p = cqModePos(a), q = cqModePos(b); return Math.hypot(p.x - q.x, p.y - q.y); };

  // personaggi del computer: chi caccia va verso il piu' vicino, chi scappa cerca il posto libero piu' lontano dal pericolo
  function chase(c, preys) {
    let best = null, bd = 1e9; for (const p of preys) { const d = near(c, p); if (d < bd) { bd = d; best = p; } }
    if (!best) { c.path = []; return; }
    const q = cqModePos(best); c.path = cqPath(c.x, c.y, q.x, q.y);
    if (!c.path.length) c.path = [[q.x, q.y]];   // nella stessa cella: dritto verso di lui
  }
  function flee(c, threats) {
    let th = null, td = 1e9; for (const t of threats) { const d = near(c, t); if (d < td) { td = d; th = t; } }
    if (!th || td > 8) { if (!c.path.length && Math.random() < 0.3) { const f = cqModeFree(); if (f) c.path = cqPath(c.x, c.y, f.x, f.y); } return; }
    const p = cqModePos(th); let best = null, bs = -1e9;
    for (let i = 0; i < 14; i++) {
      const f = cqModeFree(20); if (!f) continue;
      const sc = Math.hypot(f.x - p.x, f.y - p.y) * 1.4 - Math.hypot(f.x - c.x, f.y - c.y) * 0.5 + ((f.x - c.x) * (c.x - p.x) + (f.y - c.y) * (c.y - p.y) > 0 ? 4 : -4);   // lontano dal pericolo, non troppo lontano da me, e non dalla sua parte
      if (sc > bs) { bs = sc; best = f; }
    }
    if (best) c.path = cqPath(c.x, c.y, best.x, best.y).slice(0, 10);
  }

  CQ_MODES.infezione = {
    n: 'Infezione',
    desc: '🧟 <b>Zombie</b>: chi viene toccato diventa zombie, resisti fino alla fine! · 💣 <b>Bomba</b>: passala toccando qualcuno prima che esploda.',
    maps: [['studio', 'Studio'], ['bosco', 'Bosco'], ['hotel', 'Hotel']],
    def: { v: 'zombie', time: 90, map: 'studio', n: 8, fill: true },
    opts: o => `<div class="row"><div class="lbl">Variante</div>${seg('v', [['zombie', '🧟 Zombie'], ['bomba', '💣 Bomba a orologeria']], o.v)}</div>
      <div class="row"><div class="lbl">Durata (Zombie)</div>${seg('time', [[60, '1:00'], [90, '1:30'], [120, '2:00']], o.time)}</div>`,
    read: d => ({ v: d.get('v') === 'bomba' ? 'bomba' : 'zombie', time: +d.get('time') || 90 }),
    start(G) {
      const O = G.opt, cs = G.chars.slice().sort(() => Math.random() - 0.5);
      G.v = O.v; G.left = O.time || 90;
      if (G.v === 'bomba') { G.bomb = { id: cs[0].id, t: 20 + Math.random() * 6, cd: 0 }; cs.forEach(c => { c.out = 0; }); }
      else { const nz = G.chars.length >= 8 ? 2 : 1; cs.forEach((c, i) => { c.z = i < nz; c.zt = c.z ? -1 : 0; }); }
      // si parte sparsi: gli umani (e con la bomba tutti) lontani dagli zombie e tra loro
      const fixed = G.chars.filter(c => c.z);
      for (const c of G.chars) {
        if (c.z) continue;
        let best = null, bs = -1;
        for (let i = 0; i < 40; i++) { const p = cqModeFree(20); if (!p) continue; const d = Math.min(99, ...fixed.map(o => Math.hypot(o.x - p.x, o.y - p.y))); if (d > bs) { bs = d; best = p; } if (d > 9) break; }
        if (best) { c.x = best.x; c.y = best.y; } fixed.push(c);
      }
    },
    gstart(G) { G.v = G.opt.v; },
    intro: G => G.v === 'bomba' ? (G.bomb && G.bomb.id === G.me.id ? '💣 Hai la bomba: passala!' : '💣 Stai lontano dalla bomba!') : G.me.z ? '🧟 Sei uno ZOMBIE: prendili!' : '🏃 Scappa dagli zombie!',
    speed: c => c.z ? (cq.g && cq.g.time < WAKE ? 0 : 1.1) : 1,
    big: G => G.v !== 'bomba' && G.time < WAKE ? '🧟 Gli zombie si svegliano tra ' + Math.ceil(WAKE - G.time) + '…' : '',
    hud(G) {
      if (G.v === 'bomba') { const b = G.bomb, h = b && G.chars.find(c => c.id === b.id); return `💣 Bomba · in gioco ${alive(G).length}` + (h ? ` · 💣 <b>${esc(h.name)}</b>` : ''); }
      const z = G.chars.filter(c => c.z).length; return `🧟 Infezione · 👤 ${G.chars.length - z} · 🧟 ${z} · ⏱ ${mmss(Math.max(0, G.left))}`;
    },
    nameCol: c => c.z ? '#8ee06a' : null,
    tick(G, dt) {
      const live = alive(G);
      if (G.v === 'bomba') {
        const b = G.bomb; let h = G.chars.find(c => c.id === b.id);
        if (!h || !h.alive) { const ok = live; if (ok.length) { h = cqPickOne(ok); b.id = h.id; } }
        b.t -= dt; b.cd -= dt;
        // passaggio: la tocchi e passa (dopo un attimo si puo' ripassare)
        if (h && b.cd <= 0) { const v = live.find(c => c !== h && near(c, h) < TOUCH && !cqLagging(c)); if (v) { b.id = v.id; b.cd = 0.9; h = v; beep(900, 0.06, 0.04); if (v === G.me) cqToast('💣 Hai la bomba! Passala a qualcuno, presto!'); } }
        if (b.t <= 0 && h) {   // BUM
          h.alive = false; h.out = G.time; G.boom = { x: cqModePos(h).x, y: cqModePos(h).y, t: G.time };
          beep(90, 0.5, 0.08); beep(60, 0.6, 0.08, 0.05);
          if (h === G.me) cqToast('💥 BUM! La bomba ti è esplosa in mano. Ora guardi la partita.'); else cqToast('💥 BUM! Fuori <b>' + esc(h.name) + '</b>!');
          const rest = alive(G);
          if (rest.length <= 1) { this.finish(G); return; }
          const nh = cqPickOne(rest); b.id = nh.id; b.cd = 1.5; b.t = Math.max(9, 24 - 3 * G.chars.filter(c => !c.alive).length) + Math.random() * 5;
          if (nh === G.me) cqToast('💣 La nuova bomba è tua! Passala!');
        }
        for (const c of G.chars) {   // computer: chi ha la bomba insegue, gli altri scappano
          if (!c.bot || !c.alive) continue;
          if ((c.think -= dt) <= 0) { c.think = 0.45 + Math.random() * 0.2; if (c.id === b.id) chase(c, live.filter(o => o !== c)); else flee(c, live.filter(o => o.id === b.id)); }
          cqModeStep(c, dt, c.id === b.id ? 0.95 : 0.85);
        }
        return;
      }
      // zombie
      G.left -= dt;
      const zs = G.time < WAKE ? [] : live.filter(c => c.z), hs = live.filter(c => !c.z);
      for (const z of zs) for (const h of hs) if (!h.z && near(z, h) < TOUCH && !cqLagging(h)) {   // cqLagging: rete inceppata, qui sembra fermo
        h.z = true; h.zt = G.time; G.last = h.id; beep(200, 0.15, 0.06); beep(140, 0.25, 0.05, 0.1);
        if (h === G.me) cqToast('🧟 Ti hanno preso! Ora sei uno ZOMBIE: prendi gli altri!'); else if (z === G.me) cqToast('🧟 Hai preso <b>' + esc(h.name) + '</b>!');
      }
      for (const c of G.chars) {
        if (!c.bot || !c.alive) continue;
        if ((c.think -= dt) <= 0) { c.think = 0.4 + Math.random() * 0.25; if (c.z) chase(c, G.chars.filter(o => o.alive && !o.z)); else flee(c, G.chars.filter(o => o.alive && o.z)); }
        if (!c.z || G.time >= WAKE) cqModeStep(c, dt, c.z ? 0.76 : 0.92);
      }
      if (!G.chars.some(c => c.alive && !c.z) || G.left <= 0) this.finish(G);
    },
    finish(G) {
      const name = c => c.name + (c === G.me ? ' (tu)' : '');
      if (G.v === 'bomba') {
        const rank = G.chars.slice().sort((a, b) => (b.alive - a.alive) || (b.out - a.out)), w = rank[0];
        cqModeEnd({ t: '💣 Vince ' + esc(name(w)) + '!', why: 'Ultima persona rimasta in gioco.', win: [w.id], rank: rank.map(c => [name(c), c.alive ? '— in gioco fino alla fine' : '— esplosione a ' + mmss(c.out)]) });
        return;
      }
      const hs = G.chars.filter(c => !c.z), total = (G.opt.time || 90);
      if (hs.length) cqModeEnd({ t: '👤 Vincono i sopravvissuti!', why: hs.length > 1 ? 'Sono rimasti umani in ' + hs.length + '.' : 'Una sola persona ce l\'ha fatta!', win: hs.map(c => c.id),
        rank: hs.map(c => [name(c), '— ce l\'ha fatta']).concat(G.chars.filter(c => c.z).sort((a, b) => b.zt - a.zt).map(c => [name(c), c.zt < 0 ? '— zombie dall\'inizio' : '— zombie da ' + mmss(c.zt)])) });
      else { const last = G.chars.find(c => c.id === G.last); cqModeEnd({ t: '🧟 Vincono gli zombie!', why: 'Hanno preso tutti' + (last ? '. Ultima persona presa: <b>' + esc(last.name) + '</b> (' + mmss(last.zt) + ' su ' + mmss(total) + ').' : '.'), win: G.chars.filter(c => c.zt < 0).map(c => c.id),
        rank: G.chars.slice().sort((a, b) => b.zt - a.zt).map(c => [name(c), c.zt < 0 ? '— zombie dall\'inizio' : '— zombie da ' + mmss(c.zt)]) }); }
    },
    // online: zombie (z) e quando e' stato preso (zt); bomba (chi ce l'ha, secondi)
    csnap: c => [c.z ? 1 : 0, Math.round((c.zt || 0) * 10) / 10, Math.round((c.out || 0) * 10) / 10],
    capply(G, c, a) {
      const z = !!a[0];
      if (z && !c.z && G.time > 0.5) { c.zt = G.time; beep(200, 0.15, 0.06); if (c === G.me) cqToast('🧟 Ti hanno preso! Ora sei uno ZOMBIE: prendi gli altri!'); }
      c.z = z; c.zt = a[1]; c.out = a[2];
    },
    snap: G => ({ v: G.v, left: Math.round(G.left * 10) / 10, b: G.bomb ? [G.bomb.id, Math.round(G.bomb.t * 10) / 10] : null, boom: G.boom || null }),
    apply(G, x) {
      G.v = x.v; G.left = x.left;
      if (x.b) { const was = G.bomb && G.bomb.id; G.bomb = { id: x.b[0], t: x.b[1] }; if (was != null && was !== x.b[0]) { beep(900, 0.06, 0.04); if (x.b[0] === G.me.id) cqToast('💣 Hai la bomba! Passala a qualcuno, presto!'); } }
      if (x.boom && (!G.boom || G.boom.t !== x.boom.t)) { G.boom = x.boom; beep(90, 0.5, 0.08); beep(60, 0.6, 0.08, 0.05); }
    },
    // zombie: il personaggio diventa verde marcio con le macchie
    tint: c => c.z && c.alive ? { c: '#5e8a2e', a: 0.55, rot: 1, s: c.id } : null,
    // disegno: zombie con le mani avanti e le bollicine verdi della puzza; la bomba sopra la testa con i secondi
    deco(g, c, X, Y, TW, G, L) {
      const u = TW / 34, f = c === G.me ? cq.face : c.face;
      if (c.z && c.alive) {
        g.strokeStyle = 'rgba(120,200,70,.45)'; g.lineWidth = 2 * u; g.beginPath(); g.ellipse(X, Y, 15 * u, 6 * u, 0, 0, 7); g.stroke();
        g.fillStyle = '#6f9a3e'; for (const dy of [-21, -15]) { g.beginPath(); g.ellipse(X + f * 15 * u, Y + dy * u, 5 * u, 2.6 * u, 0, 0, 7); g.fill(); }
        // bollicine della puzza: salgono dalla testa, si allargano e spariscono
        const top = Y - cqTop(L) * TW * 0.85, now = performance.now() / 1000;
        for (let i = 0; i < 6; i++) {
          const p = (now / 1.6 + i / 6 + c.id * 0.37) % 1, bx = X + ((i % 3) - 1) * 6 * u + Math.sin(p * 7 + i * 2) * 4 * u, by = top - p * 26 * u, r = (1.4 + p * 2.6) * u;
          g.globalAlpha = Math.min(1, (1 - p) * 1.6) * 0.85;
          g.fillStyle = 'rgba(140,210,70,.55)'; g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill();
          g.strokeStyle = '#a8e060'; g.lineWidth = 0.9 * u; g.stroke();
          g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(bx - r * 0.35, by - r * 0.35, r * 0.3, 0, 7); g.fill();
        }
        g.globalAlpha = 1;
        const k = G.time - (c.zt || -9); if (k >= 0 && k < 0.7) { g.strokeStyle = 'rgba(140,240,90,' + (1 - k / 0.7) + ')'; g.lineWidth = 3 * u; g.beginPath(); g.ellipse(X, Y - 20 * u, (12 + 50 * k) * u, (8 + 30 * k) * u, 0, 0, 7); g.stroke(); }
      }
      if (G.bomb && G.bomb.id === c.id && c.alive) {
        const by = Y - (cqTop(L) + 0.55) * TW, t = Math.max(0, G.bomb.t), fl = t < 4 && Math.floor(G.time * 6) % 2;
        g.fillStyle = fl ? '#e2553a' : '#22262d'; g.beginPath(); g.arc(X, by, 9 * u, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(X - 3 * u, by - 3 * u, 3 * u, 0, 7); g.fill();
        g.strokeStyle = '#a07040'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(X + 4 * u, by - 7 * u); g.quadraticCurveTo(X + 9 * u, by - 14 * u, X + 12 * u, by - 12 * u); g.stroke();
        g.fillStyle = Math.random() < 0.5 ? '#ffd24a' : '#ff8a2a'; g.beginPath(); g.arc(X + 12 * u, by - 12 * u, (2 + Math.random() * 2) * u, 0, 7); g.fill();
        g.font = '700 12px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)';
        const s = String(Math.ceil(t)); g.textAlign = 'left'; g.strokeText(s, X + 13 * u, by + 2 * u); g.fillStyle = t < 4 ? '#ff6a5a' : '#fff'; g.fillText(s, X + 13 * u, by + 2 * u);
      }
    },
    // l'esplosione: un lampo che si allarga
    over(g, G, sx, sy, TW) {
      const b = G.boom; if (!b) return; const k = G.time - b.t; if (k < 0 || k > 0.8) return;
      const X = sx(b.x, b.y), Y = sy(b.x, b.y), r = TW * (0.4 + 2.2 * k);
      g.fillStyle = 'rgba(255,200,80,' + (0.8 * (1 - k / 0.8)) + ')'; g.beginPath(); g.ellipse(X, Y - TW * 0.4, r, r * 0.7, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,120,40,' + (0.9 * (1 - k / 0.8)) + ')'; g.beginPath(); g.ellipse(X, Y - TW * 0.4, r * 0.55, r * 0.4, 0, 0, 7); g.fill();
    }
  };
})();
