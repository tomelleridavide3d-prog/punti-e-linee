// ==== PIXEL ART (prima prova: la hall dell'hotel, direzione "Habbo con atmosfera") ====
// Ogni cosa si dipinge pixel per pixel in una figurina piccola (32 pixel d'arte per casella, come Habbo ma a meta') e poi si incolla
// ingrandita senza sfumare (pixel netti). Facce con "pennelli" (funzioni che danno il colore di ogni pixel), contorno scuro sugli oggetti,
// luce a gradini con la retinatura (dithering): pozze calde delle lampade, luce fredda delle finestre.
// Si aggancia alla mappa con CQ_MAP.pxFloor / pxProp / drawWall (vedi cqTools). Hall DEFINITIVA (20-10-2026): niente piu' scelta della grafica di prima.
(() => {
  try { localStorage.removeItem('cqPx'); } catch {}   // chi aveva scelto la grafica di prima (?pixel=0) torna alla nuova
  if (typeof cqMapHotel !== 'function') return;
  // UA = altezza di un'unita' del motore (U = TH * 1,15 = 18,4 pixel d'arte). ZS: un po' piu' alto, in proporzione ai personaggi (alti ~2,7 U):
  // porte ~3,3 U, banco ~1,25 U, pareti ~3,7 U
  const ZS = 1.12, UA = 18.4 * ZS;
  const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], dith = (X, Y) => (BY[(Y & 3) * 4 + (X & 3)] + 0.5) / 16;
  const hx = s => { const n = parseInt(s.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  // ombre e luci "colorate" (come nelle reference): scurendo il colore vira al viola-blu, schiarendo vira al caldo
  const sh = (c, k) => { const b = [c[0] * k, c[1] * k, c[2] * k]; return k < 1 ? mix(b, [48, 36, 84], (1 - k) * 0.32) : k > 1 ? mix(b, [255, 238, 206], (k - 1) * 0.45) : b; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const fr = v => v - Math.floor(v);
  const h2 = (a, b) => fr(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453);

  // ---- la tela di pixel ----
  class Pix {
    constructor(w, h, ox, oy) { this.w = w; this.h = h; this.ox = ox; this.oy = oy; this.d = new Float32Array(w * h * 3); this.a = new Uint8Array(w * h); this.em = new Uint8Array(w * h); this.ux = new Float32Array(w * h).fill(NaN); this.emit = 0; this._ux = NaN; }
    P(x, y, z) { return [this.ox + (x - y) * 16, this.oy + (x + y) * 8 - z * UA]; }
    set(X, Y, c) { if (X < 0 || Y < 0 || X >= this.w || Y >= this.h || !c) return; const i = Y * this.w + X; this.d[i * 3] = c[0]; this.d[i * 3 + 1] = c[1]; this.d[i * 3 + 2] = c[2]; this.a[i] = 1; this.em[i] = this.emit; this.ux[i] = this._ux; }
    fill(pts, f) {
      let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      for (let Y = Math.max(0, Math.floor(y0)); Y <= Math.min(this.h - 1, Math.ceil(y1)); Y++) {
        const yc = Y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let X = Math.max(0, Math.ceil(xs[k] - 0.5)); X <= Math.min(this.w - 1, Math.floor(xs[k + 1] - 0.5)); X++) this.set(X, Y, typeof f === 'function' ? f(X, Y) : f);
      }
    }
    // faccia verticale sul piano y (verso chi guarda, a sinistra): f(s, t, X, Y) con s lungo x e t in altezza, 0..1
    faceY(x0, x1, y, z0, z1, f) { this.fill([this.P(x0, y, z1), this.P(x1, y, z1), this.P(x1, y, z0), this.P(x0, y, z0)], typeof f !== 'function' ? f : (X, Y) => { const xx = (X + 0.5 - this.ox) / 16 + y, z = ((xx + y) * 8 + this.oy - (Y + 0.5)) / UA; this._ux = xx; return f((xx - x0) / (x1 - x0), (z - z0) / (z1 - z0), X, Y); }); this._ux = NaN; }
    // faccia verticale sul piano x (a destra): s lungo y
    faceX(x, y0, y1, z0, z1, f) { this.fill([this.P(x, y0, z1), this.P(x, y1, z1), this.P(x, y1, z0), this.P(x, y0, z0)], typeof f !== 'function' ? f : (X, Y) => { const yy = x - (X + 0.5 - this.ox) / 16, z = ((x + yy) * 8 + this.oy - (Y + 0.5)) / UA; this._ux = x; return f((yy - y0) / (y1 - y0), (z - z0) / (z1 - z0), X, Y); }); this._ux = NaN; }
    // faccia orizzontale all'altezza z: f(u, v) lungo x e y
    top(x0, y0, x1, y1, z, f) { this.fill([this.P(x0, y0, z), this.P(x1, y0, z), this.P(x1, y1, z), this.P(x0, y1, z)], typeof f !== 'function' ? f : (X, Y) => { const a = X + 0.5 - this.ox, b = Y + 0.5 - this.oy + z * UA, xx = (a / 16 + b / 8) / 2, yy = (b / 8 - a / 16) / 2; this._ux = xx; return f((xx - x0) / (x1 - x0), (yy - y0) / (y1 - y0), X, Y); }); this._ux = NaN; }
    box(x0, y0, x1, y1, z0, z1, c, o = {}) {
      this.faceY(x0, x1, y1, z0, z1, o.l || sh(c, 0.8));
      this.faceX(x1, y0, y1, z0, z1, o.r || sh(c, 0.64));
      this.top(x0, y0, x1, y1, z1, o.t || c);
    }
    ell(cx, cy, rx, ry, f) {
      for (let Y = Math.floor(cy - ry); Y <= Math.ceil(cy + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
        const dx = (X + 0.5 - cx) / rx, dy = (Y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(X, Y, typeof f === 'function' ? f(dx, dy, X, Y) : f);
      }
    }
    // cilindro dritto: lati sfumati a gradini (luce da sinistra), cerchio sopra piu' chiaro. side(a, t) con a = -1..1 da sinistra a destra
    cyl(cx, cy, r, z0, z1, c, o = {}) {
      const [X0, Y0] = this.P(cx, cy, z0), [, Y1] = this.P(cx, cy, z1), rx = r * 22.6, ry = r * 11.3;
      const side = (dx, t) => o.side ? o.side(dx, t) : sh(c, dx < -0.55 ? 1.0 : dx < -0.1 ? 0.88 : dx < 0.45 ? 0.76 : 0.64);
      for (let Y = Math.floor(Y1 - ry); Y <= Math.ceil(Y0 + ry); Y++) for (let X = Math.floor(X0 - rx); X <= Math.ceil(X0 + rx); X++) {
        const dx = (X + 0.5 - X0) / rx; if (Math.abs(dx) > 1) continue;
        const yy = Y + 0.5, e = ry * Math.sqrt(1 - dx * dx);
        if (yy >= Y1 && yy <= Y0 + e) this.set(X, Y, side(dx, (Y0 - yy) / Math.max(1, Y0 - Y1)));
      }
      if (o.noTop) return;
      this.ell(X0, Y1, rx, ry, o.top || sh(c, 1.1));
    }
    line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) this.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); }
    // contorno scuro sul bordo della sagoma (come Habbo). skip(i): pixel da non scurire (dove l'oggetto continua nella casella accanto)
    outline(skip) {
      const { w, h, a, d } = this, mark = [];
      for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
        const i = Y * w + X; if (!a[i]) continue;
        if (X === 0 || Y === 0 || X === w - 1 || Y === h - 1 || !a[i - 1] || !a[i + 1] || !a[i - w] || !a[i + w]) if (!skip || !skip(i)) mark.push(i);
      }
      for (const i of mark) { const c = mix(sh([d[i * 3], d[i * 3 + 1], d[i * 3 + 2]], 0.5), [34, 22, 44], 0.25); d[i * 3] = c[0]; d[i * 3 + 1] = c[1]; d[i * 3 + 2] = c[2]; }
    }
    // luce: L(X, Y) = moltiplicatore [r, g, b]; a gradini con la retinatura. I pixel che fanno luce (em) non si scuriscono
    light(L) {
      const { w, h, a, d, em } = this;
      for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
        const i = Y * w + X; if (!a[i] || em[i]) continue;
        const k = L(X, Y);
        for (let c = 0; c < 3; c++) d[i * 3 + c] *= Math.round(k[c] * 24) / 24;
      }
    }
    canvas() {
      const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
      const g = c.getContext('2d'), im = g.createImageData(this.w, this.h);
      for (let i = 0; i < this.w * this.h; i++) if (this.a[i]) { im.data[i * 4] = this.d[i * 3]; im.data[i * 4 + 1] = this.d[i * 3 + 1]; im.data[i * 4 + 2] = this.d[i * 3 + 2]; im.data[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0); return { c, ox: this.ox, oy: this.oy };
    }
  }
  const spr = (w, h, ox, oy) => new Pix(w, h, ox, oy);
  // figurina incollata con la cella x, y al suo posto (pixel netti)
  const put = (K, s, x, y) => { const [X, Y] = K.S(x, y, 0), p = K.TW / 32, g = K.g, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(s.c, X - s.ox * p, Y - s.oy * p, s.c.width * p, s.c.height * p); g.imageSmoothingEnabled = sm; };

  // ---- palette della hall ----
  const C = {
    marA: hx('#efe0c4'), marB: hx('#dcc49e'), grout: hx('#98805f'),
    red: hx('#8e2028'), red2: hx('#741820'), gold: hx('#c99a44'), gold2: hx('#e8c46a'), fringe: hx('#5a1418'),
    wood: hx('#6a3a24'), wood2: hx('#874c2e'), wood3: hx('#a5643c'), woodD: hx('#4a2818'),
    paper: hx('#2c5658'), paper2: hx('#3f7470'), cream: hx('#e8dcbc'), cream2: hx('#cdb88a'),
    brass: hx('#c8a050'), brassD: hx('#8a6a2c'), sky0: hx('#141c44'), sky1: hx('#34508e'), star: hx('#e6e8ff'), moon: hx('#f2ecd0'),
    curt: hx('#7a1e30'), leaf: [hx('#2e6a3a'), hx('#3e8a46'), hx('#5aa854')], pot: hx('#2c4e86'), sofa: hx('#86263a'), shade: hx('#f4dca0'),
  };

  // ---- luci della hall (in caselle): calde (lampade, applique, lampadario) e fredde (finestre) ----
  let LIGHTS = [], ROOM = { R: 20 };
  const AMB = [0.84, 0.8, 0.8];
  function setup(P) {
    const R = P.w - 2; ROOM = { R, W: P.w, H: P.h };
    RUGS.length = 3; for (const [t, x, y] of P.props) if (t === 'gdoor') RUGS.push({ x0: x + 0.14, y0: y + 1.08, x1: x + 0.86, y1: y + 1.72, mat: 1 });   // zerbino davanti a ogni porta
    LIGHTS = [{ x: 11, y: 8, r: 6, c: [0.32, 0.25, 0.1] }];   // lampadario sopra il tappeto
    for (const [t, x, y] of P.props) {
      if (t === 'lamp') LIGHTS.push({ x: x + 0.5, y: y + 0.5, r: 3.4, c: [0.46, 0.33, 0.12] });
      if (t === 'monitor') LIGHTS.push({ x: x + 0.5, y: y + 0.6, r: 2, c: [0.16, 0.22, 0.08] });
      if (t === 'tv') LIGHTS.push({ x: x + 1.2, y: y + 0.5, r: 2, c: [0.04, 0.1, 0.2] });
    }
    for (const x of SCONCE_B(R)) LIGHTS.push({ x: x + 0.5, y: 1.2, r: 2.4, c: [0.3, 0.21, 0.08] });
    for (const y of SCONCE_L) LIGHTS.push({ x: 1.2, y: y + 0.5, r: 2.4, c: [0.3, 0.21, 0.08] });
    for (const y of WIN_L) LIGHTS.push({ x: 1.4, y: y + 0.5, r: 2.8, c: [-0.03, 0.03, 0.16] });
  }
  const SCONCE_B = R => { const a = []; for (let x = 13; x < R; x += 2) a.push(x); return a; }, SCONCE_L = [5, 9, 13], WIN_L = [3, 7, 11];
  const lightAt = (wx, wy) => {
    let r = AMB[0], g = AMB[1], b = AMB[2];
    for (const L of LIGHTS) { const dd = Math.hypot(wx - L.x, wy - L.y); if (dd >= L.r) continue; const f = (1 - dd / L.r) ** 2; r += L.c[0] * f; g += L.c[1] * f; b += L.c[2] * f; }
    // angoli in ombra vicino ai muri in fondo
    const ao = Math.min(1, 0.8 + 0.2 * Math.min(1, (wy - 1) / 0.7), 0.8 + 0.2 * Math.min(1, (wx - 1) / 0.7));
    return [r * ao, g * ao, b * ao];
  };

  // ---- pavimento: marmo a scacchi con venature e fughe, tappeti rosso-oro, zerbino ----
  const RUGS = [{ x0: 7, y0: 5, x1: 15, y1: 11, b: 0.34 }, { x0: 9.5, y0: 11, x1: 12.5, y1: 15.4, b: 0.22 }, { x0: 9, y0: 15.4, x1: 13, y1: 16, mat: 1 }];
  function rugPx(r, wx, wy, Xg, Yg) {
    const a = wx - r.x0, b = wy - r.y0, w = r.x1 - r.x0, h = r.y1 - r.y0, e = Math.min(a, w - a, b, h - b), wv = ((Xg ^ Yg) & 1) ? 0.95 : 1;
    if (r.mat) { if (r.y0 > 15) return sh(C.woodD, (fr(a * 5) < 0.5 ? 0.9 : 1.1) * wv); return e < 0.06 ? sh(C.red2, 0.8) : e < 0.11 ? C.gold : sh(C.red, wv * 0.9); }
    if (e < 0.045) return (Math.min(b, h - b) < 0.045 && ((Xg + Yg) & 1)) ? C.cream2 : C.fringe;
    if (e < r.b) {
      const q = e / r.b;
      if (q < 0.16 || (q > 0.84)) return sh(C.gold, wv * 0.92);
      if (q > 0.44 && q < 0.56) return C.red2;
      const t = fr((a + b) * 3), u = fr((a - b) * 3);   // treccia d'oro
      return Math.abs(t - 0.5) < 0.12 || Math.abs(u - 0.5) < 0.12 ? sh(C.gold2, wv) : sh(C.red, 0.85 * wv);
    }
    const fa = fr(a * 1.0 + 0.5), fb = fr(b * 1.0 + 0.5), md = Math.abs(fa - 0.5) + Math.abs(fb - 0.5), ring = Math.max(Math.abs(fa - 0.5), Math.abs(fb - 0.5));
    if (md < 0.06) return C.gold2;
    if (md < 0.16) return sh(C.gold, 0.9);
    if (Math.abs(md - 0.24) < 0.03) return sh(C.cream2, 0.85);
    if (Math.abs(ring - 0.46) < 0.025) return sh(C.gold, 0.8);
    return sh(md > 0.36 ? C.red2 : C.red, wv);
  }
  const FL = new Map();
  function floorSpr(x, y) {
    const k = x + ',' + y; if (FL.has(k)) return FL.get(k);
    const S = spr(32, 17, 16, 0), solid = cqSolid[y] && cqSolid[y][x] && cqSolid[y][x].prop && cqSolid[y][x].prop !== 'gdoor';
    const var0 = 0.96 + 0.07 * h2(x, y), tint = (h2(y, x) - 0.5) * 0.06;
    const SHL = { counter: 0.42, monitor: 0.42, plant: 0.4, lamp: 0.22, sofa: 0.34, table: 0.28, tv: 0.3, coffee: 0.4, rack: 0.45, crate: 0.32, crate2: 0.45, bell: 0.3 };
    const ln = cqSolid[y] && cqSolid[y][x - 1], shLen = ln && ln.prop ? SHL[ln.prop] || 0 : 0, up = cqSolid[y - 1] && cqSolid[y - 1][x], shUp = up && up.prop ? (SHL[up.prop] || 0) * 0.5 : 0;
    S.top(0, 0, 1, 1, 0, (u, v, X, Y) => {
      const wx = x + u, wy = y + v, Xg = (x - y) * 16 + X, Yg = (x + y) * 8 + Y;
      let c = null;
      for (const r of RUGS) if (wx >= r.x0 && wx < r.x1 && wy >= r.y0 && wy < r.y1) { c = rugPx(r, wx, wy, Xg, Yg); break; }
      if (!c) {
        c = sh((x + y) % 2 ? C.marB : C.marA, var0); c = [c[0] * (1 + tint), c[1], c[2] * (1 - tint)];
        const f = Math.sin(wx * 5.1 + Math.sin(wy * 3.7 + wx * 1.3) * 2.2 + wy * 3.3);
        if (Math.abs(f) < 0.05) c = sh(c, 0.9);
        else if (h2(Xg, Yg) > 0.988) c = sh(c, 1.05);
        if (u < 1 / 16 || v < 1 / 16) c = C.grout;
        else if (u < 2 / 16 || v < 1.6 / 16) c = sh(c, 1.08);
        else if (u > 15 / 16 || v > 15 / 16) c = sh(c, 0.86);
      }
      if ((shLen && u < shLen && v > 0.1 && v < 0.9 && (u < shLen - 0.06 || dith(X, Y) < 0.5)) || (shUp && v < shUp && u > 0.15 && u < 0.85 && (v < shUp - 0.05 || dith(X, Y) < 0.5))) c = mix(sh(c, 0.8), [70, 60, 112], 0.16);   // ombra proiettata
      if (solid) { const e = Math.min(u, 1 - u, v, 1 - v); if (e > 0.12 || (e > 0.06 && dith(X, Y) < 0.5)) c = sh(c, 0.78); }   // ombra sotto l'oggetto
      return c;
    });
    S.light((X, Y) => { const a = X + 0.5 - 16, b = Y + 0.5; return lightAt(x + (a / 16 + b / 8) / 2, y + (b / 8 - a / 16) / 2); });
    const s = S.canvas(); FL.set(k, s); return s;
  }

  // ---- muri: in fondo e a sinistra alti (boiserie, carta da parati, cornice), davanti e a destra balaustra bassa ----
  const WH = 3.3;
  let EM = 0;   // il pixel appena dato da wallTex fa luce (vetro, cielo, paralumi): non si scurisce
  function wallTex(side, w, i, s, z, X, Y) {
    // finestre (muro di sinistra) con le tende
    if (side === 'l') {
      for (const wy of WIN_L) {
        const a = w - wy;   // 0..1 dentro la casella della finestra
        if (a > -0.3 && a < 1.3 && z > 2.72 && z < 2.98) return z < 2.78 && fr(w * 8) < 0.5 ? C.gold : sh(C.curt, 1.05);   // mantovana con la frangia
        if ((a > -0.3 && a < 0.14) || (a > 0.86 && a < 1.3)) if (z > 0.55 && z < 2.72) { const f = fr(w * 9); return Math.abs(z - 1.55) < 0.06 ? C.gold : sh(C.curt, f < 0.3 ? 0.78 : f > 0.8 ? 1.15 : 1); }
        if (a >= 0.14 && a <= 0.86 && z > 0.92 && z < 2.72) {
          const ac = (a - 0.5) / 0.36, top = 2.3 + 0.42 * Math.sqrt(Math.max(0, 1 - ac * ac));
          if (z > top) break;
          if (z < 1.0 || z > top - 0.07 || Math.abs(ac) > 0.86) return C.cream;
          if (Math.abs(ac) < 0.07 || Math.abs(z - 1.85) < 0.05) return C.cream2;
          const t = (z - 1.0) / 1.7; let c = mix(C.sky0, C.sky1, Math.floor(t * 5 + dith(X, Y)) / 5);
          EM = 1;
          if (wy === 7 && Math.hypot(a - 0.66, (z - 2.25) * 0.8) < 0.1) c = C.moon;
          else if (h2(X + i * 7, Y) > 0.975) c = C.star;
          return c;
        }
      }
      for (const wy of SCONCE_L) if (Math.abs(w - wy - 0.5) < 0.09 && z > 2.0 && z < 2.45) return z > 2.3 ? (EM = 1, C.shade) : C.brass;
    } else {
      // muro in fondo: casellario delle chiavi dietro la reception, quadro, orologio, applique tra le porte
      if (w > 3.08 && w < 8.92 && z > 1.4 && z < 2.7) {
        if (w < 3.16 || w > 8.84 || z < 1.48 || z > 2.62) return C.woodD;
        const gx = fr((w - 3.16) * 3), gz = fr((z - 1.48) * 3.5);
        if (gx < 0.12 || gz < 0.14) return C.wood2;
        return gx > 0.4 && gx < 0.6 && gz > 0.35 && gz < 0.6 && h2(Math.floor(w * 3), Math.floor(z * 3.5)) > 0.35 ? C.gold2 : hx('#2a1810');
      }
      if (w > 1.15 && w < 2.85 && z > 1.5 && z < 2.62) {
        if (w < 1.25 || w > 2.75 || z < 1.6 || z > 2.52) return (fr(w * 10 + z * 4) < 0.5) ? C.gold : C.gold2;
        const hz = 1.9 + 0.12 * Math.sin(w * 4) + 0.06 * Math.sin(w * 11);   // paesaggio: cielo al tramonto, colline, mare
        if (z > hz) return mix(hx('#e8a868'), hx('#5a6ab0'), Math.floor((z - hz) / (2.52 - hz) * 4 + dith(X, Y)) / 4);
        return z > 1.78 ? hx('#3e6a44') : hx('#2a4a72');
      }
      if (Math.hypot(w - 10.5, (z - 2.15) * 0.75) < 0.34) { const d = Math.hypot(w - 10.5, (z - 2.15) * 0.75); if (d > 0.27) return C.gold; const ang = Math.atan2(z - 2.15, w - 10.5); if ((d < 0.2 && Math.abs(ang - 1.2) < 0.18) || (d < 0.15 && Math.abs(ang + 0.4) < 0.25)) return hx('#2a1a14'); return C.cream; }
      if (SCONCE_B(ROOM.R).includes(Math.floor(w)) && Math.abs(fr(w) - 0.5) < 0.09 && z > 2.0 && z < 2.45) return z > 2.3 ? (EM = 1, C.shade) : C.brass;
    }
    // strati del muro
    if (z < 0.22) return z > 0.18 ? C.wood3 : C.woodD;
    if (z < 1.15) {
      const ps = fr(w * 2);
      if (ps < 0.08 || ps > 0.92 || z < 0.3 || z > 1.07) return C.wood;
      if (ps < 0.12 || z > 1.03) return C.wood3;
      if (ps > 0.88 || z < 0.34) return C.woodD;
      return C.wood2;
    }
    if (z < 1.22) return z > 1.19 ? C.gold2 : C.gold;
    if (z < 3.0) {
      const row = Math.floor(z * 4.35), a = fr(w * 4 + (row % 2) * 0.5), b = fr(z * 4.35), dd = Math.abs(a - 0.5) + Math.abs(b - 0.5) * 1.2;
      if (dd < 0.07) return C.gold;
      if (dd < 0.2) return C.paper2;
      return fr(w * 8) < 0.06 ? sh(C.paper, 1.08) : C.paper;
    }
    return z > 3.22 ? C.cream : z < 3.04 ? hx('#78603c') : C.cream2;
  }
  // luce sul muro: quella della stanza vicino al muro + l'alone delle applique
  const wallLight = (side, w, z) => {
    const L = side === 'l' ? lightAt(1.05, w) : lightAt(w, 1.05);
    for (const s of side === 'l' ? SCONCE_L : SCONCE_B(ROOM.R)) { const dd = Math.hypot(w - s - 0.5, (z - 2.3) * 0.7); if (dd < 1.1) { const f = (1 - dd / 1.1) ** 2 * 0.5; L[0] += f; L[1] += f * 0.75; L[2] += f * 0.3; } }
    return L;
  };
  const WL = new Map();
  function wallSpr(x, y) {
    const k = x + ',' + y; if (WL.has(k)) return WL.get(k);
    const R = ROOM.R, S = spr(40, 100, 20, 80), back = y === 0, left = x === 0, front = y === ROOM.H - 1, right = x === ROOM.W - 1;
    const tex = side => (s, t, X, Y) => {
      const w = side === 'l' ? y + s * (S._y1 - S._y0) + S._y0 : x + S._x0 + s * (S._x1 - S._x0), z = t * WH;
      EM = 0; const c = wallTex(side, w, side === 'l' ? y : x, s, z, X, Y); if (EM) return c;
      const L = wallLight(side, w, z);
      return [c[0] * Math.round(L[0] * 24) / 24, c[1] * Math.round(L[1] * 24) / 24, c[2] * Math.round(L[2] * 24) / 24];
    };
    const topC = C.woodD;
    if (back || left) {
      if (back && left) { S._x0 = 0.8; S._x1 = 1; S._y0 = 0.8; S._y1 = 1; S.box(0.8, 0.8, 1, 1, 0, WH, C.cream2, { l: tex('b'), r: tex('l'), t: topC }); }
      else if (back) { const x1 = right ? 0.2 : 1; S._x0 = 0; S._x1 = x1; S.box(0, 0.8, x1, 1, 0, WH, C.cream2, { l: tex('b'), r: sh(C.paper, 0.6), t: topC }); }
      else { const y1 = front ? 0.2 : 1; S._y0 = 0; S._y1 = y1; S.box(0.8, 0, 1, y1, 0, WH, C.cream2, { l: sh(C.paper, 0.7), r: tex('l'), t: topC }); }
    } else {
      // balaustra bassa (davanti e a destra); all'ingresso (davanti, x 10-12) colonnine d'ottone con il cordone rosso
      const ent = front && x >= 10 && x <= 12;
      if (ent) {
        for (const px of x === 10 ? [0.15] : x === 12 ? [0.85] : []) S.cyl(px, 0.1, 0.07, 0, 0.75, C.brass, { top: C.gold2 });
        const [X0, Y0] = S.P(x === 10 ? 0.15 : 0, 0.1, 0.62), [X1, Y1] = S.P(x === 12 ? 0.85 : 1, 0.1, 0.62);
        for (let i = 0; i <= 24; i++) { const t = i / 24, sag = Math.sin(t * Math.PI) * 3; S.set(Math.round(X0 + (X1 - X0) * t), Math.round(Y0 + (Y1 - Y0) * t + sag), C.red); S.set(Math.round(X0 + (X1 - X0) * t), Math.round(Y0 + (Y1 - Y0) * t + sag + 1), C.red2); }
      } else if (front) { const xa = left ? 0.8 : 0, xb = right ? 0.2 : 1; S.box(xa, 0, xb, 0.2, 0, 0.5, C.wood, { l: (s, t) => t > 0.82 ? C.brass : fr((xa + s * (xb - xa)) * 4) < 0.18 ? C.woodD : C.wood2 }); S.box(xa, 0, xb, 0.2, 0.5, 0.58, C.brass); }
      else { const ya = 0, yb = front ? 0.2 : 1; S.box(0, ya, 0.2, yb, 0, 0.5, C.wood, { r: (s, t) => t > 0.82 ? C.brass : fr(s * 4) < 0.18 ? C.woodD : C.wood2 }); S.box(0, ya, 0.2, yb, 0.5, 0.58, C.brass); }
      S.outline();
    }
    const s = S.canvas(); WL.set(k, s); return s;
  }

  // ---- oggetti della hall ----
  const PR = new Map();
  const same = (x, y, ts) => { const o = cqSolid[y] && cqSolid[y][x]; return !!(o && o.prop && ts.includes(o.prop)); };
  function propSpr(t, x, y, o) {
    const k = t + ',' + x + ',' + y + ',' + (o && o.c || ''); if (PR.has(k)) return PR.get(k);
    const S = spr(48, 100, 24, 78), glow = [];
    let skip = null;
    const marble = (u, v, X, Y) => { const f = Math.sin((x + u) * 6 + Math.sin(v * 5) * 2); return Math.abs(f) < 0.12 ? C.cream2 : h2(X + x * 9, Y) > 0.96 ? sh(C.cream, 1.05) : C.cream; };
    switch (t) {
      case 'counter': case 'monitor': {   // banco della reception in mogano, piano di marmo, fascia d'ottone; monitor = ultimo pezzo con la lampada verde da banchiere
        const jl = same(x - 1, y, ['counter', 'monitor']), jr = same(x + 1, y, ['counter', 'monitor']);
        S.box(0, 0.12, 1, 0.8, 0, 1.0, C.wood, { l: (s, tt) => { const ps = fr(s * 2); return tt < 0.1 ? C.brass : tt > 0.9 ? C.wood3 : (ps < 0.1 || ps > 0.9 || tt < 0.2 || tt > 0.82) ? C.woodD : ps < 0.16 ? C.wood3 : C.wood2; } });
        S.box(-0.02, 0.06, 1.02, 0.86, 1.0, 1.12, C.cream, { t: marble, l: C.cream2, r: sh(C.cream2, 0.8) });
        if (t === 'monitor') {
          S.box(0.15, 0.3, 0.55, 0.62, 1.12, 1.18, hx('#7a2a22'), { t: (u, v) => fr(u * 4) < 0.5 ? hx('#efe6cc') : hx('#e2d6b4') });   // libro degli ospiti
          S.cyl(0.72, 0.45, 0.06, 1.12, 1.16, C.brass); S.box(0.7, 0.43, 0.74, 0.47, 1.16, 1.55, C.brass);
          S.emit = 1; S.cyl(0.72, 0.45, 0.17, 1.52, 1.66, hx('#2e7a4a'), { top: hx('#3e9a5a') }); S.emit = 0;
          glow.push([0.72, 0.45, 1.5, 1.3, 'rgba(190,255,170,.22)']);
        }
        skip = i => { const u = S.ux[i]; return (jl && u < 0.06) || (jr && u > 0.94); };
        break;
      }
      case 'bell': {   // leggio del concierge con il campanello d'ottone e la targhetta
        S.box(0.28, 0.32, 0.72, 0.68, 0, 1.05, C.wood, { l: (s, tt) => tt > 0.88 || tt < 0.08 ? C.brass : Math.abs(s - 0.5) < 0.3 && tt > 0.35 && tt < 0.7 ? C.wood2 : C.wood });
        S.box(0.24, 0.28, 0.76, 0.72, 1.05, 1.12, C.woodD);
        S.cyl(0.5, 0.5, 0.11, 1.12, 1.15, C.brassD);
        const [bx, by] = S.P(0.5, 0.5, 1.15); S.ell(bx, by - 2, 4.5, 4, (dx, dy) => dy > 0.5 ? null : sh(C.gold2, dx < -0.3 && dy < -0.2 ? 1.2 : dx > 0.4 ? 0.75 : 1)); S.set(Math.round(bx), Math.round(by - 7), C.brass);
        break;
      }
      case 'gdoor': {   // porta ad arco del colore del gioco, cornice di legno scuro, sopraluce acceso, chiave di volta d'oro
        const c = hx(o.c && o.c[0] === '#' ? o.c : '#6b6f78'), F = 0.1;
        S.box(0.02, -0.02, 0.98, F, 0, 2.98, C.woodD, { l: (s, tt) => {
          const z = tt * 2.98, ac = (s - 0.5) / 0.38, arch = 2.3 + 0.45 * Math.sqrt(Math.max(0, 1 - ac * ac));
          if (Math.abs(ac) <= 1 && z < arch) {
            if (z > arch - 0.06 || Math.abs(ac) > 0.93) return C.gold;
            if (z > 2.25) return Math.abs(ac) < 0.05 || fr(ac * 3 + 0.5) < 0.08 ? C.woodD : C.shade;   // sopraluce: il gioco dentro e' acceso
            if (Math.abs(ac) < 0.04) return sh(c, 0.6);
            const pa = fr((s - 0.12) / 0.76 * 2), pz = z < 1.1 ? (z - 0.12) / 0.98 : (z - 1.2) / 1.0;
            if (z < 0.12 || (z > 1.1 && z < 1.2) || pa < 0.12 || pa > 0.88 || pz < 0.08 || pz > 0.92) return sh(c, 0.82);
            if (pa < 0.18 || pz > 0.86) return sh(c, 1.12);
            if (!o.k && (Math.abs(z - (0.6 + s * 0.4)) < 0.06 || Math.abs(z - (1.6 - s * 0.5)) < 0.06)) return hx('#9a7444');
            return c;
          }
          if (z > 2.8 && Math.abs(s - 0.5) < 0.07) return C.gold2;   // chiave di volta
          return fr(s * 6 + z) < 0.06 ? C.wood : C.woodD;
        } });
        S.box(-0.02, -0.02, 1.02, 0.16, 2.98, 3.12, C.gold, { t: C.gold2 });
        // maniglia e targhetta
        S.emit = 0; const [hxp, hyp] = S.P(0.72, F, 1.15); S.set(Math.round(hxp), Math.round(hyp), C.gold2); S.set(Math.round(hxp) + 1, Math.round(hyp), C.gold);
        S.emit = 1; S.faceY(0.13, 0.87, F, 2.25, 2.75, (s, tt) => { const ac = (0.13 + s * 0.74 - 0.5) / 0.38, z = 2.25 + tt * 0.5; return z < 2.3 + 0.45 * Math.sqrt(Math.max(0, 1 - ac * ac)) - 0.06 && Math.abs(ac) < 0.93 && !(Math.abs(ac) < 0.05 || fr(ac * 3 + 0.5) < 0.08) ? C.shade : null; }); S.emit = 0;
        break;
      }
      case 'lamp': {   // lampada a stelo d'ottone con il paralume acceso
        S.cyl(0.5, 0.5, 0.2, 0, 0.06, C.brassD, { top: C.brass });
        S.box(0.46, 0.46, 0.54, 0.54, 0.06, 1.85, C.brass, { l: C.brass, r: C.brassD });
        S.emit = 1; S.cyl(0.5, 0.5, 0.3, 1.75, 2.3, C.shade, { side: (dx, tt) => sh(C.shade, (dx < -0.3 ? 1.04 : dx < 0.4 ? 0.96 : 0.86) * (tt < 0.15 ? 0.9 : 1)), top: hx('#fff2c8') }); S.emit = 0;
        glow.push([0.5, 0.5, 2.0, 2.1, 'rgba(255,196,110,.34)']);
        break;
      }
      case 'plant': {   // vaso di ceramica blu con il bordo bianco, pianta folta a ciuffi
        S.cyl(0.5, 0.5, 0.27, 0, 0.42, C.pot, { side: (dx, tt) => { const b = Math.abs(tt - 0.75) < 0.08 ? hx('#e8ecf4') : Math.abs(tt - 0.3) < 0.05 ? hx('#c9a24a') : C.pot; return sh(b, dx < -0.5 ? 1.12 : dx < 0 ? 1 : dx < 0.5 ? 0.86 : 0.72); }, top: hx('#3a2a1a') });
        const n = 26;   // chioma folta e tonda: ciuffi dal basso (scuri) all'alto (chiari)
        for (let i = 0; i < n; i++) {
          const q = i / n, a = i * 2.4 + h2(x, i) * 0.6, rr = (0.12 + 0.26 * h2(i, y)) * (1 - q * 0.55), zz = 0.55 + 1.05 * q + 0.15 * h2(x + i, y + i);
          const [cx, cy] = S.P(0.5 + Math.cos(a) * rr, 0.5 + Math.sin(a) * rr, zz), rx = 6 + 4 * h2(i, x) - q * 2, ry = 4.5 + 2.5 * h2(y, i) - q, col = C.leaf[Math.min(2, Math.floor(q * 3 + h2(i, x) * 0.6))];
          S.ell(cx, cy, rx, ry, (dx, dy) => sh(col, dy < -0.3 && dx < 0.2 ? 1.18 : dy > 0.4 ? 0.78 : 1));
        }
        break;
      }
      case 'sofa': {   // divano Chesterfield bordeaux con i bottoni; i pezzi vicini fanno un divano solo, braccioli alle estremita'
        const jl = same(x - 1, y, ['sofa']), jr = same(x + 1, y, ['sofa']), c = C.sofa;
        const tuft = (s, tt, X, Y) => { const a = fr((x + s) * 5), b = fr(tt * 3); return (Math.abs(a - 0.5) < 0.08 && Math.abs(b - 0.5) < 0.1) ? sh(c, 0.6) : Math.abs(a - 0.5) + Math.abs(b - 0.5) < 0.12 ? sh(c, 0.85) : sh(c, 0.95); };
        S.box(0, 0.06, 1, 0.34, 0.45, 1.35, c, { l: tuft, t: sh(c, 1.15) });
        S.box(0, 0.34, 1, 0.94, 0, 0.5, c, { l: (s, tt) => tt < 0.15 ? C.woodD : sh(c, 0.72), t: (u, v) => (Math.abs(fr(x + u) - 0.5) > 0.47 ? sh(c, 0.8) : v < 0.15 ? sh(c, 0.9) : sh(c, 1.08)) });
        if (!jl) S.box(0, 0.06, 0.18, 0.94, 0, 0.85, c, { t: sh(c, 1.15), l: sh(c, 0.82) });
        if (!jr) S.box(0.82, 0.06, 1, 0.94, 0, 0.85, c, { t: sh(c, 1.15) });
        skip = i => { const u = S.ux[i]; return (jl && u < 0.06) || (jr && u > 0.94); };
        break;
      }
      case 'table': {   // tavolino tondo di noce con il vaso di fiori rossi
        S.cyl(0.5, 0.5, 0.22, 0, 0.05, C.woodD); S.box(0.46, 0.46, 0.54, 0.54, 0.05, 0.62, C.wood);
        S.cyl(0.5, 0.5, 0.42, 0.62, 0.72, C.wood2, { top: (dx, dy) => (dx * dx + dy * dy > 0.8 ? C.wood3 : fr(dx * 3 + dy) < 0.15 ? C.wood : C.wood2) });
        S.cyl(0.5, 0.5, 0.07, 0.72, 0.98, hx('#dfe6f2'), { top: hx('#2a6a3a') });
        for (let i = 0; i < 7; i++) { const [fx, fy] = S.P(0.5 + 0.12 * Math.cos(i * 0.9), 0.5 + 0.12 * Math.sin(i * 0.9), 1.05 + 0.1 * (i % 3)); S.ell(fx, fy, 2.2, 1.8, i % 3 ? hx('#c8303a') : hx('#e04850')); if (i % 2) S.set(Math.round(fx) + 2, Math.round(fy) + 2, C.leaf[1]); }
        break;
      }
      case 'tv': {   // radio-televisore d'epoca in legno, schermo azzurrino acceso verso la stanza
        S.box(0.1, 0.18, 0.88, 0.82, 0, 0.12, C.woodD);
        S.box(0.12, 0.2, 0.86, 0.8, 0.12, 0.95, C.wood2, { r: (s, tt) => { if (s > 0.12 && s < 0.66 && tt > 0.25 && tt < 0.88) return null; if (s > 0.74 && s < 0.86 && (Math.abs(tt - 0.7) < 0.07 || Math.abs(tt - 0.45) < 0.07)) return C.brass; return fr(s * 9) < 0.15 && tt < 0.2 ? C.wood : sh(C.wood2, 0.7); }, t: C.wood3 });
        S.emit = 1; S.faceX(0.86, 0.2 + 0.12 * 0.6, 0.2 + 0.66 * 0.6, 0.12 + 0.25 * 0.83, 0.12 + 0.88 * 0.83, (s, tt, X, Y) => mix(hx('#7ab0d8'), hx('#c8e6f8'), (Y % 2) * 0.3 + tt * 0.4)); S.emit = 0;
        S.line(...S.P(0.4, 0.5, 0.95), ...S.P(0.25, 0.4, 1.45), hx('#3a3a40')); S.line(...S.P(0.5, 0.5, 0.95), ...S.P(0.7, 0.55, 1.45), hx('#3a3a40'));
        glow.push([1.2, 0.5, 0.5, 1.3, 'rgba(150,200,255,.18)']);
        break;
      }
      case 'coffee': {   // angolo caffe': mobiletto di legno, macchina dell'espresso cromata, tazzine
        S.box(0.05, 0.12, 0.95, 0.86, 0, 1.0, C.wood, { l: (s, tt) => tt < 0.08 ? C.brass : fr(s * 3) < 0.08 ? C.woodD : C.wood2 });
        S.box(0.02, 0.08, 0.98, 0.9, 1.0, 1.08, C.cream, { t: marble });
        S.box(0.2, 0.25, 0.75, 0.65, 1.08, 1.75, hx('#b8c0c8'), { l: (s, tt) => tt > 0.85 ? C.brass : Math.abs(s - 0.5) < 0.12 && tt < 0.55 && tt > 0.3 ? hx('#2a2a30') : hx('#c8d0d8'), r: hx('#8a9098'), t: hx('#dfe6ec') });
        for (const u of [0.25, 0.42, 0.85]) S.cyl(u, 0.78, 0.05, 1.08, 1.16, hx('#f4f0e8'));
        break;
      }
      case 'rack': {   // carrello portabagagli d'ottone con le valigie colorate
        S.box(0.08, 0.1, 0.92, 0.9, 0.08, 0.16, C.brass, { t: hx('#8a2a2a') });
        for (const [a, b] of [[0.1, 0.12], [0.86, 0.12], [0.1, 0.84], [0.86, 0.84]]) S.cyl(a, b, 0.05, 0, 0.08, hx('#222'));
        S.box(0.1, 0.12, 0.16, 0.18, 0.16, 1.9, C.brass); S.box(0.1, 0.82, 0.16, 0.88, 0.16, 1.9, C.brass); S.box(0.1, 0.12, 0.16, 0.88, 1.84, 1.92, C.gold2);
        const cs = y % 2 ? [hx('#b8443e'), hx('#3e6aa8'), hx('#c8a24a')] : [hx('#4a8a5a'), hx('#8a4aa0'), hx('#c86a3a')];
        let z = 0.16; [[0.25, 0.85, 0.45], [0.3, 0.8, 0.38], [0.35, 0.75, 0.3]].forEach(([a, b, hh], i) => { const c = cs[i]; S.box(0.25, a, 0.85, b, z, z + hh, c, { l: (s, tt) => Math.abs(s - 0.3) < 0.04 || Math.abs(s - 0.7) < 0.04 ? hx('#5a3a24') : sh(c, 0.8), t: (u, v) => Math.abs(u - 0.5) < 0.08 && Math.abs(v - 0.5) < 0.2 ? hx('#3a2a1a') : c }); z += hh; });
        break;
      }
      case 'crate': case 'crate2': {   // baule da viaggio di cuoio con gli angoli d'ottone (crate2: con la cappelliera a righe sopra)
        const c = hx('#7a4a2a'), corner = (s, tt) => (s < 0.08 || s > 0.92) && (tt < 0.12 || tt > 0.88) ? C.brass : Math.abs(tt - 0.5) < 0.05 ? hx('#3a2414') : fr(s * 4) < 0.06 ? hx('#5a3418') : null;
        S.box(0.08, 0.15, 0.92, 0.85, 0, 0.8, c, { l: (s, tt) => corner(s, tt) || sh(c, 0.8), r: (s, tt) => corner(s, tt) || sh(c, 0.64), t: (u, v) => (u < 0.08 || u > 0.92) && (v < 0.1 || v > 0.9) ? C.brass : fr(u * 4) < 0.08 ? hx('#5a3418') : sh(c, 1.05) });
        if (t === 'crate2') S.cyl(0.5, 0.5, 0.3, 0.8, 1.35, hx('#e8dcc0'), { side: (dx, tt) => sh(fr(dx * 3) < 0.5 ? hx('#e8dcc0') : hx('#5a8aa8'), dx < -0.4 ? 1.05 : dx < 0.3 ? 0.92 : 0.78), top: hx('#5a8aa8') });
        else S.box(0.42, 0.15, 0.58, 0.85, 0.8, 0.86, hx('#3a2414'));
        break;
      }
      default: return null;
    }
    S.outline(skip);
    const L = lightAt(x + 0.5, y + 0.5).map(v => 0.3 + 0.7 * v);
    S.light(() => L);
    const s = Object.assign(S.canvas(), { glow }); PR.set(k, s); return s;
  }

  // ---- ganci verso il motore ----
  const pxFloor = (K, x, y) => {
    put(K, floorSpr(x, y), x, y);
    if (x === 11 && y === 8) K.glow(11, 8, 3.6 * ZS, 3.2, 'rgba(255,214,150,.16)');   // lampadario (solo luce)
  };
  const drawWall = (K, x, y) => { put(K, wallSpr(x, y), x, y); const back = y === 0, left = x === 0; if (back && SCONCE_B(ROOM.R).includes(x)) K.glow(x + 0.5, y + 0.95, 2.35 * ZS, 1.1, 'rgba(255,200,120,.3)'); if (left && SCONCE_L.includes(y)) K.glow(x + 0.95, y + 0.5, 2.35 * ZS, 1.1, 'rgba(255,200,120,.3)'); };
  const pxProp = (K, t, x, y, o) => { const s = propSpr(t, x, y, o); if (!s) return false; put(K, s, x, y); for (const [a, b, z, r, col] of s.glow) K.glow(x + a, y + b, z * ZS, r, col); return true; };

  const mk = cqMapHotel;
  CQ_MAPS.hotel.make = () => { const P = mk(); P.decals = []; P.signY = 0.1; P.signUp = 2.45; P.pxFloor = pxFloor; P.pxProp = pxProp; P.drawWall = drawWall; setup(P); FL.clear(); WL.clear(); PR.clear(); return P; };
  delete CQ_MAPS.hotel.pack;
  if (cq.map === 'hotel') { cq.mapDirty = true; cqUseMap('hotel'); }
})();
