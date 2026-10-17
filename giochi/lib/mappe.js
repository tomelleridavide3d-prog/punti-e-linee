// MODULO GENERATORE DI MAPPE COL SEME (aiuti presi dal bosco: stessi numeri a caso su tutti i telefoni con lo stesso seme).
// Si carica con cqLib('mappe') e si usa da CQ_LIB.mappe. Servira' a isola, labirinto, citta', deserto.
//   rnd(seme) -> funzione che da' numeri a caso 0-1 (sempre uguali con lo stesso seme)
//   inR(x, y, [rx, ry, rw, rh], margine), hit(a, b, margine): rettangoli
//   wobble(rnd, n, forza) -> f(angolo) = 1 +- forza: bordo irregolare (isole, laghi, radure)
//   flood(W, H, free, x, y) -> celle raggiungibili da x, y (Uint8Array W*H)
//   scatter(rnd, n, prova, ok, lontani, gia) -> fino a n punti [x, y] dove ok(x, y), lontani almeno 'lontani' tra loro e da quelli in gia
(() => {
  CQ_LIB.mappe = {
    rnd(seed) { let s = seed | 0 || 1; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
    inR: (x, y, [rx, ry, rw, rh], m = 0) => x >= rx - m && x < rx + rw + m && y >= ry - m && y < ry + rh + m,
    hit: (a, b, m = 0) => a[0] - m < b[0] + b[2] && b[0] - m < a[0] + a[2] && a[1] - m < b[1] + b[3] && b[1] - m < a[1] + a[3],
    wobble(rnd, n = 3, k = 0.12) {
      const W = []; for (let i = 0; i < n; i++) W.push([2 + i * 2 + Math.floor(rnd() * 2), rnd() * 7, (0.5 + rnd() * 0.5) * k / (i + 1)]);
      return a => 1 + W.reduce((s, [f, p, m]) => s + Math.sin(a * f + p) * m, 0);
    },
    flood(W, H, free, x, y) {
      const seen = new Uint8Array(W * H); if (!free(x, y)) return seen;
      const q = [y * W + x]; seen[q[0]] = 1;
      while (q.length) { const i = q.pop(), cx = i % W, cy = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, j = ny * W + nx; if (nx >= 0 && ny >= 0 && nx < W && ny < H && !seen[j] && free(nx, ny)) { seen[j] = 1; q.push(j); } } }
      return seen;
    },
    scatter(rnd, n, tries, ok, sep = 0, have = []) {
      const out = [];
      for (let i = 0; i < tries && out.length < n; i++) {
        const p = ok(rnd); if (!p) continue;
        if (sep && out.concat(have).some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < sep)) continue;
        out.push(p);
      }
      return out;
    }
  };
})();
