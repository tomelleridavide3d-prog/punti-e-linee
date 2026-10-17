// MODULO OGGETTI DA RACCOGLIERE E PORTARE (pezzi della zattera, e in futuro forziere, idolo, messaggi, frammenti di mappa).
// Si carica con cqLib('oggetti') e si usa da CQ_LIB.oggetti. Gli oggetti della partita stanno in G.it (li crea make, l'host li manda agli amici con snap/apply).
// Un oggetto: { id, k: tipo, st: 0 a terra / 1 in mano al personaggio c / 2 consegnato alla base b, x, y, x0, y0 (dove stava all'inizio), nb: [chi, fino a] non puo' riprenderlo subito }.
// I tipi si registrano con kind(k, { n: nome, a: 'il nome' con l'articolo, e: emoji, w: velocita' di chi lo porta (1 normale, meno = pesante), draw(g, X, Y, TW, t) }).
(() => {
  const KINDS = {};
  const O = CQ_LIB.oggetti = {
    KINDS,
    kind(k, def) { KINDS[k] = def; },
    make: list => list.map(([k, x, y], id) => ({ id, k, st: 0, c: -1, b: -1, x, y, x0: x, y0: y, nb: null })),
    held: (G, c) => G.it.find(i => i.st === 1 && i.c === c.id),
    grab(G, c, it) { it.st = 1; it.c = c.id; it.b = -1; it.nb = null; },
    // a terra in x, y; by = chi l'ha lasciato (non lo riprende per 1,5 s: serve quando glielo fanno cadere)
    drop(G, it, x, y, by) { it.st = 0; it.c = -1; it.b = -1; it.x = x; it.y = y; it.nb = by ? [by.id, G.time + 1.5] : null; },
    put(G, it, b) { it.st = 2; it.c = -1; it.b = b; },
    // chi passa sopra a un oggetto a terra (entro r) lo prende, se ok(c, it) lo permette. Restituisce l'oggetto preso
    pickup(G, c, p, r, ok) {
      if (O.held(G, c)) return null;
      for (const it of G.it) {
        if (it.st !== 0 || (it.nb && it.nb[0] === c.id && it.nb[1] > G.time)) continue;
        if (Math.hypot(it.x - p.x, it.y - p.y) < r && (!ok || ok(c, it))) { O.grab(G, c, it); return it; }
      }
      return null;
    },
    // oggetti in mano a chi non c'e' piu' o e' fuori gioco (gone(c)): cadono dove si trovava
    orphans(G, gone) { for (const it of G.it) if (it.st === 1) { const c = G.chars.find(o => o.id === it.c); if (!c || gone(c)) { const p = c ? cqModePos(c) : it; O.drop(G, it, p.x, p.y); } } },
    count: (G, b, k) => G.it.filter(i => i.st === 2 && i.b === b && (!k || i.k === k)).length,
    speed(G, c) { const it = O.held(G, c); return it && KINDS[it.k] ? KINDS[it.k].w || 1 : 1; },
    snap: G => G.it.map(i => [i.st, i.c, Math.round(i.x * 10) / 10, Math.round(i.y * 10) / 10, i.b]),
    apply(G, a) { a.forEach((v, n) => { const i = G.it[n]; if (i) { i.st = v[0]; i.c = v[1]; i.x = v[2]; i.y = v[3]; i.b = v[4]; } }); },
    // disegno sopra alla mappa: quelli a terra (se see(x, y)) con un'ombra che pulsa, quelli in mano sopra la testa (se show(c))
    draw(g, G, sx, sy, TW, see, show) {
      const t = performance.now() / 1000;
      for (const it of G.it) {
        const K = KINDS[it.k]; if (!K) continue;
        if (it.st === 0) {
          if (!see(it.x, it.y)) continue;
          const X = sx(it.x, it.y), Y = sy(it.x, it.y), b = Math.sin(t * 3 + it.id) * 0.06;
          g.fillStyle = 'rgba(255,240,160,' + (0.22 + b) + ')'; g.beginPath(); g.ellipse(X, Y, TW * 0.42, TW * 0.21, 0, 0, 7); g.fill();
          K.draw(g, X, Y, TW, t);
        } else if (it.st === 1) {
          const c = G.chars.find(o => o.id === it.c); if (!c || !show(c)) continue;
          const p = cqModePos(c); g.save(); g.translate(sx(p.x, p.y), sy(p.x, p.y) - TW * 1.55); g.scale(0.72, 0.72); K.draw(g, 0, 0, TW, t); g.restore();
        }
      }
    }
  };
})();
