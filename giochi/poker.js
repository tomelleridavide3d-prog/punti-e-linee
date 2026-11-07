// ==== POKER AL TAVOLINO (Texas Hold'em No Limit) ====
// Decisioni dell'utente in CLAUDE.md "POKER: DECISIONI". Carte: CARTE.fr (giochi/lib/carte.js, mazzo francese a 4 colori).
// Qui: grafica comune (fiches, pile, tavolo). Il motore delle regole arrivera' fra // ==PK ENGINE== e // ==END PK ENGINE==.
(() => {
  const TAU = Math.PI * 2, E = 0.5;   // E = schiacciamento delle fiches viste di tre quarti
  const CPU = typeof CQ_CPU !== 'undefined' ? CQ_CPU : { willReadFrequently: true };
  // tagli delle fiches: valore -> [colore, colore del bordo laterale]
  const CHIPS = [[5000, '#e06a1c'], [1000, '#e2a91c'], [500, '#7a46b8'], [100, '#2a2d33'], [25, '#2c9a52'], [10, '#2f6fd0'], [5, '#d03a32']];
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const chipCol = v => (CHIPS.find(c => c[0] === v) || CHIPS[CHIPS.length - 1])[1];

  // la faccia di una fiche vista dall'alto, raggio r, centro (0,0)
  function chipTop(g, r, col, val) {
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = col; g.fill();
    g.fillStyle = '#fbf7ee';
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, w = 0.3; g.beginPath(); g.arc(0, 0, r, a - w, a + w); g.arc(0, 0, r * 0.74, a + w, a - w, true); g.closePath(); g.fill(); }
    g.beginPath(); g.arc(0, 0, r * 0.62, 0, TAU); g.fillStyle = shade(col, 1.18); g.fill();
    g.setLineDash([r * 0.16, r * 0.12]); g.beginPath(); g.arc(0, 0, r * 0.55, 0, TAU); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, r * 0.05); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.arc(0, 0, r - 0.5, 0, TAU); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke();
    if (val && r >= 14) {
      g.fillStyle = col === '#e2a91c' ? '#3a2408' : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const t = val >= 1000 ? (val / 1000) + 'K' : String(val); g.font = `800 ${Math.round(r * (t.length > 2 ? 0.52 : 0.62))}px system-ui, sans-serif`; g.fillText(t, 0, r * 0.03);
    }
  }
  // una fiche di lato (la fascia) con le strisce bianche che si vedono davanti
  function chipSide(g, x, y, r, t, col) {
    g.beginPath(); g.ellipse(x, y, r, r * E, 0, 0, Math.PI); g.lineTo(x - r, y - t); g.ellipse(x, y - t, r, r * E, 0, Math.PI, 0, true); g.closePath();
    g.fillStyle = shade(col, 0.82); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#f3eee2';
    for (let k = 0; k < 6; k++) { const a = (k + 0.5) / 6 * Math.PI, w = r * 0.3 * Math.sin(a), cx = x + r * Math.cos(a), yb = y + r * E * Math.sin(a); g.fillRect(cx - w / 2, yb - t + 0.5, w, t - 1); }
  }
  const stackCache = new Map();
  // una pila di fiches (cols = colori dal basso), raggio r in pixel veri -> canvas
  function stack(cols, r) {
    const key = cols.join() + '_' + r; let c = stackCache.get(key); if (c) return c;
    const t = Math.max(2, r * 0.24), W = Math.ceil(r * 2 + 4), H = Math.ceil(r * E * 2 + t * cols.length + 4);
    c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', CPU);
    const x = W / 2, yb = H - r * E - 2;
    cols.forEach((col, i) => chipSide(g, x, yb - i * t, r, t, col));
    g.save(); g.translate(x, yb - cols.length * t); g.scale(1, E); chipTop(g, r, cols[cols.length - 1]); g.restore();
    if (stackCache.size > 300) stackCache.clear();
    stackCache.set(key, c); return c;
  }
  // una fiche sola vista dall'alto (per le legende e il piatto che vola)
  function chip(val, r) {
    const key = 'c' + val + '_' + r; let c = stackCache.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = Math.ceil(r * 2 + 2); const g = c.getContext('2d', CPU);
    g.translate(c.width / 2, c.height / 2); chipTop(g, r, chipCol(val), val); stackCache.set(key, c); return c;
  }
  // una somma -> pile da disegnare: al massimo `max` pile di al massimo `per` fiches, dal taglio piu' grosso
  function piles(amount, max = 3, per = 8) {
    let left = Math.round(amount); const out = [];
    for (const [v, col] of CHIPS) {
      let n = Math.floor(left / v); if (!n) continue; left -= n * v;
      while (n > 0 && out.length < max) { const k = Math.min(per, n); out.push(Array(k).fill(col)); n -= k; }
      if (out.length >= max) break;
    }
    if (!out.length && amount > 0) out.push([CHIPS[CHIPS.length - 1][1]]);
    return out;
  }
  // le pile accostate in una sola immagine (pile piu' alte dietro, a destra)
  function pileImg(amount, r, max, per) {
    const ps = piles(amount, max, per); if (!ps.length) return null;
    const ims = ps.map(p => stack(p, r)), gap = r * 1.55, W = Math.ceil(ims[0].width + gap * (ims.length - 1)), H = Math.max(...ims.map(i => i.height));
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', CPU);
    ims.forEach((im, i) => g.drawImage(im, i * gap, H - im.height));
    return c;
  }

  // ---- il tavolo: sala in penombra, sponda imbottita, bordo di legno, panno verde (canvas disegnato una volta per misura) ----
  function stadium(g, x, y, w, h) { const r = Math.min(w, h) / 2; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function table(cv, vw, vh, T, dpr) {
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    // sala: pavimento scuro con la luce della lampada sopra il tavolo
    const bg = g.createRadialGradient(vw / 2, T.y + T.h * 0.45, 40, vw / 2, T.y + T.h * 0.45, Math.max(vw, vh) * 0.75);
    bg.addColorStop(0, '#4a3220'); bg.addColorStop(0.55, '#2a1b11'); bg.addColorStop(1, '#120b07'); g.fillStyle = bg; g.fillRect(0, 0, vw, vh);
    g.globalAlpha = 0.07; g.fillStyle = '#000'; for (let x = 0; x < vw; x += 34) g.fillRect(x, 0, 1.2, vh); g.globalAlpha = 1;   // assi del parquet
    const { x, y, w, h } = T, R = T.rail;
    // ombra del tavolo sul pavimento
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 30; g.shadowOffsetY = 14; stadium(g, x, y, w, h); g.fillStyle = '#1a0f09'; g.fill(); g.restore();
    // sponda imbottita (pelle scura) con il riflesso della lampada
    stadium(g, x, y, w, h); const lp = g.createLinearGradient(x, y, x + w, y + h); lp.addColorStop(0, '#5a3522'); lp.addColorStop(0.5, '#3a2014'); lp.addColorStop(1, '#24130b'); g.fillStyle = lp; g.fill();
    g.save(); stadium(g, x, y, w, h); g.clip(); g.globalAlpha = 0.18; const hl = g.createRadialGradient(x + w * 0.35, y + h * 0.2, 10, x + w * 0.35, y + h * 0.2, w * 0.9); hl.addColorStop(0, '#fff'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fillRect(x, y, w, h); g.restore();
    stadium(g, x + 1.5, y + 1.5, w - 3, h - 3); g.strokeStyle = 'rgba(255,220,180,.18)'; g.lineWidth = 1.5; g.stroke();
    // bordo di legno lucido
    const wx = x + R, wy = y + R, ww = w - 2 * R, wh = h - 2 * R, WB = Math.max(5, R * 0.32);
    stadium(g, wx, wy, ww, wh); const wd = g.createLinearGradient(wx, wy, wx + ww, wy + wh); wd.addColorStop(0, '#c48a4a'); wd.addColorStop(0.5, '#8a5a2c'); wd.addColorStop(1, '#5a3618'); g.fillStyle = wd; g.fill();
    stadium(g, wx, wy, ww, wh); g.strokeStyle = '#2a170b'; g.lineWidth = 1.5; g.stroke();
    // panno
    const fx = wx + WB, fy = wy + WB, fw = ww - 2 * WB, fh = wh - 2 * WB;
    stadium(g, fx, fy, fw, fh);
    const fl = g.createRadialGradient(fx + fw / 2, fy + fh * 0.45, 20, fx + fw / 2, fy + fh * 0.45, Math.max(fw, fh) * 0.62);
    fl.addColorStop(0, '#2f8d55'); fl.addColorStop(0.55, '#22713f'); fl.addColorStop(1, '#133f25'); g.fillStyle = fl; g.fill();
    g.save(); stadium(g, fx, fy, fw, fh); g.clip();
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let yy = fy; yy < fy + fh; yy += 4) for (let xx = fx + ((yy / 4) % 2) * 2; xx < fx + fw; xx += 4) g.fillRect(xx, yy, 1, 1);   // trama del panno
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 14; stadium(g, fx - 12, fy - 12, fw + 24, fh + 24); g.lineWidth = 24; g.strokeStyle = '#000'; g.stroke();   // ombra del bordo sul panno
    g.restore();
    // linea delle puntate e stemma al centro (i quattro semi)
    const li = Math.min(fw, fh) * 0.16; stadium(g, fx + li * 0.55, fy + li, fw - li * 1.1, fh - li * 2); g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 1.5; g.stroke();
    if (typeof CARTE !== 'undefined') {
      g.globalAlpha = 0.12; const cx = fx + fw / 2, cy = fy + fh * 0.5 + T.cw * 1.15, s = 15;
      for (const [su, dx] of [['s', -1.5], ['h', -0.5], ['c', 0.5], ['d', 1.5]]) { g.save(); CARTE.fr.pip(g, su, cx + dx * s * 1.5, cy, s, false, true); g.restore(); }
      g.globalAlpha = 1;
    }
    return { fx, fy, fw, fh };
  }

  window.PKART = { CHIPS, chip, stack, piles, pileImg, table, stadium, fmt, chipCol };
})();
