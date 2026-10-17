// MODULO INDIZI SCRITTI DALLA MAPPA: frasi fatte con i posti veri ("vicino al relitto, in alto a destra dell'isola").
// Si carica con cqLib('indizi') e si usa da CQ_LIB.indizi. Servira' anche ai giochi d'indagine (treno, falsario, far west, fantasmi).
// Un punto di riferimento: { x, y, n: 'il relitto', a: 'al relitto' (dopo "vicino") }.
//   dir(dx, dy) -> 'in alto a destra' (come si vede sullo schermo: x va a destra-giu', y a sinistra-giu')
//   near(L, x, y, max) -> il riferimento piu' vicino entro max (o null)
//   clue(cosa, x, y, L, cx, cy, dove) -> "La vela è vicino al relitto, in alto a destra dell'isola."
(() => {
  const I = CQ_LIB.indizi = {
    dir(dx, dy) {
      const sx = dx - dy, sy = dx + dy;
      if (Math.hypot(sx, sy) < 3) return 'al centro';
      return Math.abs(sx) > Math.abs(sy) * 1.5 ? (sx > 0 ? 'a destra' : 'a sinistra') : Math.abs(sy) > Math.abs(sx) * 1.5 ? (sy > 0 ? 'in basso' : 'in alto') : (sy > 0 ? 'in basso ' : 'in alto ') + (sx > 0 ? 'a destra' : 'a sinistra');
    },
    near(L, x, y, max = 9) { let b = null, bd = max; for (const l of L) { const d = Math.hypot(l.x - x, l.y - y); if (d < bd) { bd = d; b = l; } } return b; },
    clue(what, x, y, L, cx, cy, where = "dell'isola") {
      const l = I.near(L, x, y), d = I.dir(x - cx, y - cy), part = d === 'al centro' ? 'al centro ' + where : d + ' ' + where;
      return what + ' è ' + (l ? 'vicino ' + l.a + ', ' + part : part) + '.';
    }
  };
})();
