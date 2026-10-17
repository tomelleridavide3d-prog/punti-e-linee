// MODULO SQUADRE E BASI (comune ai giochi a squadre: Ruba la bandiera, Naufraghi; poi Assedio, Arrembaggio, Tempio, Spie).
// Si carica con cqLib('squadre') e si usa da CQ_LIB.squadre. Le squadre stanno in c.t (0, 1).
//   TEAMS: squadre di partenza (nome, aggettivo femminile f, colore c, colore chiaro l, emoji e); un gioco puo' passarne di sue.
//   split(G): squadre a caso, meta' e meta'.  side(A, B, x, y): da che parte del campo e' x, y (taglio a meta' strada tra le basi A e B).
//   spawn(b, r): cella libera e raggiungibile vicino al punto b (partenza e ritorno dopo essere stati presi).
//   voice(G, c): volume della voce (compagni sempre, nemici da vicino, fantasmi muti).  ring(g, c, X, Y, TW, T): cerchio della squadra ai piedi.
//   edge(g, X, Y, W, H, icon, col): freccia sul bordo dello schermo verso qualcosa fuori.  end(G, w, why, line, score, T): fine partita a squadre.
(() => {
  const TEAMS = [{ n: 'Rossi', f: 'rossa', c: '#e04848', l: '#ff8a80', e: '🔴' }, { n: 'Blu', f: 'blu', c: '#3d7be0', l: '#8ab8ff', e: '🔵' }];
  CQ_LIB.squadre = {
    TEAMS,
    split(G) { const sh = G.chars.slice().sort(() => Math.random() - 0.5); sh.forEach((c, i) => { c.t = i % 2; }); return sh; },
    side(A, B, x, y) { const dx = B.x - A.x, dy = B.y - A.y; return (x - (A.x + B.x) / 2) * dx + (y - (A.y + B.y) / 2) * dy < 0 ? 0 : 1; },
    spawn(b, r = 7) {
      for (let i = 0; i < 80; i++) { const x = Math.floor(b.x + (Math.random() - 0.5) * r), y = Math.floor(b.y + (Math.random() - 0.5) * r); if (cqCellFree(x, y) && Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y) > 1.2 && cqPath(b.x, b.y, x + 0.5, y + 0.5).length) return { x: x + 0.5, y: y + 0.5 }; }
      return cqSpot(Math.floor(b.x), Math.floor(b.y));
    },
    voice: (G, c) => !c.alive ? 0 : c.t === G.me.t ? 1 : null,
    ring(g, c, X, Y, TW, T) {
      if (c.t == null) return;
      g.strokeStyle = (T || TEAMS)[c.t].c; g.lineWidth = 2.5; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(X, Y, TW * 0.34, TW * 0.17, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
    },
    edge(g, X, Y, W, H, icon, col) {
      const m = 34, top = 120, bot = H - 140; if (X > m && X < W - m && Y > top && Y < bot) return;
      const cx = W / 2, cy = (top + bot) / 2, dx = X - cx, dy = Y - cy, k = Math.min(Math.abs((W / 2 - m) / (dx || 1e-6)), Math.abs(((bot - top) / 2) / (dy || 1e-6)));
      const ex = cx + dx * k, ey = cy + dy * k, a = Math.atan2(dy, dx);
      g.fillStyle = col; g.beginPath(); g.moveTo(ex + Math.cos(a) * 20, ey + Math.sin(a) * 20); g.lineTo(ex + Math.cos(a + 2.4) * 12, ey + Math.sin(a + 2.4) * 12); g.lineTo(ex + Math.cos(a - 2.4) * 12, ey + Math.sin(a - 2.4) * 12); g.fill();
      g.fillStyle = 'rgba(20,22,28,.85)'; g.beginPath(); g.arc(ex, ey, 13, 0, 7); g.fill();
      g.font = '14px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(icon, ex, ey + 1);
    },
    // w = squadra vincitrice (-1 pareggio); line(c) -> [nome, testo]; score(c) -> numero per l'ordine dentro la squadra
    end(G, w, why, line, score, T) {
      T = T || TEAMS;
      const rank = G.chars.slice().sort((x, y) => (w >= 0 ? (y.t === w) - (x.t === w) : 0) || score(y) - score(x)).map(line);
      if (w < 0) cqModeEnd({ t: '🤝 Pareggio!', why, win: [], rank });
      else cqModeEnd({ t: T[w].e + ' Vincono i ' + T[w].n + '!', why, win: G.chars.filter(c => c.t === w).map(c => c.id), rank });
    }
  };
})();
