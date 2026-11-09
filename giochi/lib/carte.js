// ==== CARTE NAPOLETANE (Briscola al tavolino; riusabili per altri giochi di carte) ====
// Ogni carta si disegna col canvas UNA VOLTA per misura (cache), poi si incolla e basta: niente ridisegni a ogni fotogramma.
// Semi: 'd' denari, 'c' coppe, 's' spade, 'b' bastoni. Valori 1..10 (1 Asso, 8 Fante, 9 Cavallo, 10 Re).
// Disegno su una carta "logica" W x H (proporzioni delle napoletane vere), stile pulito: colori pieni, contorno scuro, un riflesso.
// CARTE.card(seme, valore, larghezza in pixel veri) / CARTE.back(larghezza) -> canvas pronto.
(() => {
  const W = 240, H = 400, TAU = Math.PI * 2, INK = '#2b1b12';
  const RED = '#cf2a1f', BLUE = '#2156a5', GREEN = '#2f8a3a', SKIN = '#f3c9a0';
  const SUIT = { d: { ink: '#9a5b00' }, c: { ink: '#b8231b' }, s: { ink: '#1f4f9a' }, b: { ink: '#22702e' } };
  const LAB = ['', 'A', '2', '3', '4', '5', '6', '7', 'F', 'C', 'R'];
  const CPU = typeof CQ_CPU !== 'undefined' ? CQ_CPU : { willReadFrequently: true };   // disegno dal processore (vedi CLAUDE.md: telefono)
  const cache = new Map();
  let K = 1;   // pixel veri per unita' della carta logica (decide quanti dettagli disegnare)

  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };
  const ell = (g, x, y, rx, ry, a = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, TAU); };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const fs = (g, f) => { g.fillStyle = f; g.fill(); g.stroke(); };
  const goldH = (g, x0, x1) => { const q = g.createLinearGradient(x0, 0, x1, 0); q.addColorStop(0, '#fff0a0'); q.addColorStop(.38, '#f7c93a'); q.addColorStop(1, '#c9860c'); return q; };
  const pen = (g, s, det) => { g.scale(s / 100, s / 100); g.lineWidth = det ? 3 : 5.5; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; };

  // ---- i quattro semi, disegnati al centro (0,0) alti s; det = con i dettagli fini ----
  function denaro(g, s, det) {
    g.save(); pen(g, s, det);
    const q = g.createRadialGradient(-16, -18, 4, 0, 0, 50);
    q.addColorStop(0, '#fff3b0'); q.addColorStop(.55, '#f7c93a'); q.addColorStop(1, '#d8950f');
    circ(g, 0, 0, 48); fs(g, q);
    if (det) {
      circ(g, 0, 0, 36.5); g.lineWidth = 2; g.stroke();
      g.fillStyle = '#a8690a'; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; circ(g, Math.cos(a) * 42.3, Math.sin(a) * 42.3, 2.1); g.fill(); }
      for (let i = 0; i < 8; i++) { g.save(); g.rotate((i + .5) / 8 * TAU); ell(g, 0, -23, 4.2, 9); fs(g, GREEN); g.restore(); }
    }
    for (let i = 0; i < 8; i++) { g.save(); g.rotate(i / 8 * TAU); g.beginPath(); g.moveTo(0, -6); g.quadraticCurveTo(11, -18, 0, det ? -31 : -37); g.quadraticCurveTo(-11, -18, 0, -6); fs(g, RED); g.restore(); }
    circ(g, 0, 0, det ? 8 : 11); fs(g, '#f7c93a');
    if (det) {
      circ(g, 0, 0, 3); g.fillStyle = RED; g.fill();
      g.beginPath(); g.arc(0, 0, 45, Math.PI * 1.1, Math.PI * 1.42); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.stroke();
    }
    g.restore();
  }
  function coppa(g, s, det) {
    g.save(); pen(g, s, det);
    const gold = goldH(g, -32, 32);
    g.beginPath(); g.moveTo(-6, 30); g.bezierCurveTo(-8, 40, -26, 39, -26, 46); g.lineTo(26, 46); g.bezierCurveTo(26, 39, 8, 40, 6, 30); g.closePath(); fs(g, gold);
    ell(g, 0, 46, 26, 4.5); fs(g, gold);
    g.beginPath(); g.rect(-5, -6, 10, 37); fs(g, gold);
    ell(g, 0, 21, 9, 4.5); fs(g, gold);
    ell(g, 0, 3, 11, 6.5); fs(g, RED);
    const bowl = () => { g.beginPath(); g.moveTo(-31, -42); g.bezierCurveTo(-31, -16, -18, -5, 0, -5); g.bezierCurveTo(18, -5, 31, -16, 31, -42); g.closePath(); };
    bowl(); fs(g, gold);
    if (det) {
      g.save(); bowl(); g.clip();
      g.fillStyle = RED; g.fillRect(-40, -32, 80, 9);
      g.fillStyle = '#ffe58a'; for (const x of [-20, -7, 7, 20]) { circ(g, x, -27.5, 2.1); g.fill(); }
      g.lineWidth = 2; g.beginPath(); g.moveTo(-40, -32); g.lineTo(40, -32); g.moveTo(-40, -23); g.lineTo(40, -23); g.stroke();
      g.restore(); bowl(); g.lineWidth = 3; g.stroke();
    }
    ell(g, 0, -42, 31, 6.5); fs(g, gold);
    ell(g, 0, -42, 25, 3.8); g.fillStyle = '#8f1d16'; g.fill();   // il vino
    if (det) { g.beginPath(); g.moveTo(-25, -33); g.quadraticCurveTo(-24, -17, -12, -11); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.stroke(); }
    g.restore();
  }
  function spada(g, s, det) {
    g.save(); pen(g, s, det);
    const bl = g.createLinearGradient(-7, 0, 7, 0); bl.addColorStop(0, '#eef6ff'); bl.addColorStop(.45, '#9cc0ec'); bl.addColorStop(1, '#2f62b0');
    g.beginPath(); g.moveTo(0, -50); g.lineTo(7, -38); g.lineTo(7, 15); g.lineTo(-7, 15); g.lineTo(-7, -38); g.closePath(); fs(g, bl);
    if (det) { g.beginPath(); g.moveTo(0, -37); g.lineTo(0, 11); g.strokeStyle = '#2c5aa0'; g.lineWidth = 2; g.stroke(); g.strokeStyle = INK; g.lineWidth = 3; }
    const gold = goldH(g, -26, 26);
    rr(g, -24, 14, 48, 9, 4.5); fs(g, gold);
    circ(g, -25, 18.5, 5); fs(g, RED); circ(g, 25, 18.5, 5); fs(g, RED);
    if (det) { circ(g, 0, 18.5, 3.4); fs(g, RED); }
    g.beginPath(); g.rect(-5, 23, 10, 17); fs(g, '#8a3a1c');
    if (det) { g.strokeStyle = '#f2c230'; g.lineWidth = 2; g.beginPath(); for (const y of [26.5, 30.5, 34.5]) { g.moveTo(-4, y); g.lineTo(4, y + 2.5); } g.stroke(); g.strokeStyle = INK; g.lineWidth = 3; }
    circ(g, 0, 45, 6.5); fs(g, gold);
    g.restore();
  }
  function bastone(g, s, det) {
    g.save(); pen(g, s, det);
    const stub = (x, y, a, l) => {
      g.save(); g.translate(x, y); g.rotate(a);
      g.beginPath(); g.rect(-2, -4.5, l + 2, 9); fs(g, '#3f9a3f');
      ell(g, l, 0, 2.6, 4.5); fs(g, '#f0d9a0');
      g.restore();
    };
    stub(-9, -20, -2.6, 12); stub(8, 2, -0.5, 11); stub(-6, 22, -2.7, 9);
    const body = () => { g.beginPath(); g.moveTo(-5, 46); g.bezierCurveTo(-7, 20, -13, -8, -13, -34); g.bezierCurveTo(-13, -52, 13, -52, 13, -34); g.bezierCurveTo(13, -8, 7, 20, 5, 46); g.quadraticCurveTo(0, 50, -5, 46); g.closePath(); };
    const wd = g.createLinearGradient(-14, 0, 14, 0); wd.addColorStop(0, '#a6dc84'); wd.addColorStop(.4, '#4fa548'); wd.addColorStop(1, '#1f6328');
    body(); fs(g, wd);
    if (det) {
      g.save(); body(); g.clip();
      g.strokeStyle = '#2b7a30'; g.lineWidth = 1.6; g.beginPath();
      g.moveTo(-4, -40); g.quadraticCurveTo(-7, -22, -3, -6); g.moveTo(5, -30); g.quadraticCurveTo(7, -14, 3, 6); g.moveTo(-3, 4); g.quadraticCurveTo(-4, 14, -1, 24);
      g.stroke();
      g.fillStyle = RED; g.fillRect(-20, 30, 40, 7); g.strokeStyle = '#f2c230'; g.lineWidth = 2; g.beginPath(); g.moveTo(-20, 30); g.lineTo(20, 30); g.moveTo(-20, 37); g.lineTo(20, 37); g.stroke();
      g.restore(); g.strokeStyle = INK; g.lineWidth = 3; body(); g.stroke();
      ell(g, 17, -45, 7, 3.4, -0.7); fs(g, '#7cc95a'); ell(g, 20, -36, 6, 3, 0.3); fs(g, '#7cc95a');
    }
    g.restore();
  }
  const PIP = { d: denaro, c: coppa, s: spada, b: bastone };
  const pip = (g, su, x, y, s) => { g.save(); g.translate(x, y); PIP[su](g, s, s * K >= 34); g.restore(); };

  // ---- numeri: disposizione dei simboli (come sulle carte vere, ma dritti per contarli a colpo d'occhio) ----
  const LAY = {
    2: [[120, 112], [120, 288]], 3: [[120, 100], [120, 200], [120, 300]],
    4: [[84, 120], [156, 120], [84, 280], [156, 280]],
    5: [[82, 110], [158, 110], [120, 200], [82, 290], [158, 290]],
    6: [[84, 102], [156, 102], [84, 200], [156, 200], [84, 298], [156, 298]],
    7: [[86, 98], [154, 98], [60, 200], [120, 200], [180, 200], [86, 302], [154, 302]],
  };
  const PS = { 2: 94, 3: 82, 4: 84, 5: 76, 6: 76, 7: 68 }, PK = { d: .8, c: 1, s: 1, b: 1 };

  function asso(g, su) {
    // raggi di sole intorno al simbolo grande (l'asso e' la carta piu' forte: si riconosce a colpo d'occhio)
    const RAY = { d: RED, c: RED, s: BLUE, b: GREEN }[su], R0 = su === 'd' ? 70 : 62;
    g.save(); g.translate(120, 200); g.lineWidth = 2.4; g.strokeStyle = INK; g.lineJoin = 'round';
    if (su !== 'd') { circ(g, 0, 0, R0); g.fillStyle = '#fff4cf'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = '#d8b25a'; g.stroke(); g.lineWidth = 2.4; g.strokeStyle = INK; }
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU, r1 = R0 + (i % 2 ? 22 : 34), w = i % 2 ? .07 : .09;
      g.beginPath(); g.moveTo(Math.cos(a - w) * R0, Math.sin(a - w) * R0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a + w) * R0, Math.sin(a + w) * R0); g.closePath();
      fs(g, i % 2 ? RAY : '#f7c93a');
    }
    g.restore();
    if (su === 'd') pip(g, 'd', 120, 200, 152);
    else if (su === 'c') pip(g, 'c', 120, 204, 180);
    else pip(g, su, 120, 200, 236);
  }

  // ---- figure ----
  const THEME = { d: { robe: GREEN, cape: RED }, c: { robe: BLUE, cape: RED }, s: { robe: RED, cape: BLUE }, b: { robe: RED, cape: GREEN } };
  function ermine(g, x0, x1, y0, rows) {
    g.fillStyle = INK;
    for (let r = 0; r < rows; r++) for (let x = x0 + (r % 2) * 8; x <= x1; x += 16) { const y = y0 + r * 11; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2.4, y + 7); g.lineTo(x + 2.4, y + 7); g.closePath(); g.fill(); }
  }
  function sleeve(g, pts, col) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.lineWidth = 25; g.strokeStyle = INK; g.stroke(); g.lineWidth = 20; g.strokeStyle = col; g.stroke();
    g.lineWidth = 2.6; g.strokeStyle = INK;
  }
  function heldSword(g, x, y, len) {   // spada impugnata: elsa stretta, impugnatura nella mano, pomolo sotto
    const bl = g.createLinearGradient(x - 6, 0, x + 6, 0); bl.addColorStop(0, '#eef6ff'); bl.addColorStop(.45, '#9cc0ec'); bl.addColorStop(1, '#2f62b0');
    g.beginPath(); g.moveTo(x, y - len); g.lineTo(x + 6, y - len + 13); g.lineTo(x + 6, y - 20); g.lineTo(x - 6, y - 20); g.lineTo(x - 6, y - len + 13); g.closePath(); fs(g, bl);
    g.beginPath(); g.moveTo(x, y - len + 14); g.lineTo(x, y - 26); g.strokeStyle = '#2c5aa0'; g.lineWidth = 1.8; g.stroke(); g.strokeStyle = INK; g.lineWidth = 2.6;
    g.beginPath(); g.rect(x - 4, y - 17, 8, 30); fs(g, '#8a3a1c');
    circ(g, x, y + 17, 5.5); fs(g, goldH(g, x - 6, x + 6));
    rr(g, x - 19, y - 24, 38, 7, 3.5); fs(g, goldH(g, x - 20, x + 20));
    circ(g, x - 20, y - 20.5, 4.2); fs(g, RED); circ(g, x + 20, y - 20.5, 4.2); fs(g, RED); circ(g, x, y - 20.5, 2.6); fs(g, RED);
  }
  // il simbolo del seme tenuto in una mano in (x, y): spada e bastone dritti, coppa e moneta appoggiate sopra
  function item(g, su, x, y, len) {
    if (su === 's') heldSword(g, x, y, len);
    else if (su === 'b') pip(g, 'b', x, y - 26, Math.min(130, len * .8));
    else if (su === 'c') pip(g, 'c', x, y - 40, 72);
    else pip(g, 'd', x, y - 33, 58);
  }
  function hand(g, x, y) { circ(g, x, y, 8.5); fs(g, SKIN); }
  function cuff(g, x, y) { ell(g, x, y, 12.5, 6); fs(g, '#fffaf0'); }
  function eyes(g, x, y, d) {
    g.fillStyle = INK; ell(g, x - d, y, 2.3, 3); g.fill(); ell(g, x + d, y, 2.3, 3); g.fill();
    circ(g, x - d - 3.5, y + 10, 4.3); circ(g, x + d + 3.5, y + 10, 4.3); g.fillStyle = 'rgba(230,90,70,.28)'; g.fill();
  }
  function re(g, su) {
    const T = THEME[su];
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 2.6;
    ell(g, 120, 360, 66, 8); g.fillStyle = 'rgba(70,45,20,.16)'; g.fill();
    // mantello dietro, scarpe
    g.beginPath(); g.moveTo(92, 140); g.bezierCurveTo(70, 200, 52, 300, 46, 352); g.quadraticCurveTo(120, 368, 194, 352); g.bezierCurveTo(188, 300, 170, 200, 148, 140); g.closePath(); fs(g, T.cape);
    ell(g, 101, 357, 13, 6); fs(g, '#5a2a14'); ell(g, 139, 357, 13, 6); fs(g, '#5a2a14');
    // veste con la fascia d'oro, la cintura e l'ermellino in fondo
    const gown = () => { g.beginPath(); g.moveTo(102, 136); g.bezierCurveTo(88, 140, 82, 150, 82, 160); g.bezierCurveTo(80, 230, 70, 300, 66, 350); g.quadraticCurveTo(120, 360, 174, 350); g.bezierCurveTo(170, 300, 160, 230, 158, 160); g.bezierCurveTo(158, 150, 152, 140, 138, 136); g.closePath(); };
    gown(); g.fillStyle = T.robe; g.fill();
    g.save(); gown(); g.clip();
    g.fillStyle = 'rgba(0,0,0,.13)'; g.fillRect(142, 120, 60, 250);
    g.beginPath(); g.moveTo(112, 150); g.lineTo(128, 150); g.lineTo(137, 360); g.lineTo(103, 360); g.closePath(); fs(g, '#f2c230');
    g.fillStyle = T.cape; for (let y = 232; y < 330; y += 22) { g.beginPath(); g.moveTo(120, y - 7); g.lineTo(125.5, y); g.lineTo(120, y + 7); g.lineTo(114.5, y); g.closePath(); g.fill(); }
    g.fillStyle = '#f2c230'; g.fillRect(60, 203, 120, 11); g.beginPath(); g.moveTo(60, 203); g.lineTo(180, 203); g.moveTo(60, 214); g.lineTo(180, 214); g.stroke();
    g.fillStyle = '#fffaf0'; g.fillRect(40, 330, 160, 40); g.beginPath(); g.moveTo(40, 330); g.lineTo(200, 330); g.stroke();
    ermine(g, 72, 170, 335, 2);
    g.restore(); gown(); g.stroke();
    rr(g, 112, 200, 16, 17, 3); fs(g, '#f2c230'); circ(g, 120, 208.5, 3.6); fs(g, RED);
    // braccio destro con il simbolo del seme, braccio sinistro con il globo
    sleeve(g, [[94, 158], [77, 184], [73, 203]], T.robe);
    item(g, su, 73, 212, 168);
    ell(g, 73, 203, 12.5, 6); fs(g, '#fffaf0');
    circ(g, 73, 212, 8.5); fs(g, SKIN);
    sleeve(g, [[146, 158], [166, 186], [162, 208]], T.robe);
    ell(g, 162, 208, 12.5, 6); fs(g, '#fffaf0');
    circ(g, 161, 216, 8.5); fs(g, SKIN);
    circ(g, 161, 196, 13); fs(g, goldH(g, 148, 174));
    g.beginPath(); g.moveTo(148, 196); g.quadraticCurveTo(161, 201, 174, 196); g.moveTo(161, 183); g.lineTo(161, 209); g.stroke();
    g.beginPath(); g.moveTo(161, 183); g.lineTo(161, 172); g.moveTo(156, 177); g.lineTo(166, 177); g.lineWidth = 3.6; g.strokeStyle = INK; g.stroke(); g.lineWidth = 2; g.strokeStyle = '#f2c230'; g.stroke(); g.lineWidth = 2.6; g.strokeStyle = INK;
    // stola d'ermellino sulle spalle
    g.beginPath(); g.moveTo(84, 152); g.quadraticCurveTo(120, 126, 156, 152); g.quadraticCurveTo(162, 168, 150, 172); g.quadraticCurveTo(120, 158, 90, 172); g.quadraticCurveTo(78, 168, 84, 152); g.closePath(); fs(g, '#fffaf0');
    ermine(g, 94, 148, 148, 2);
    // testa: capelli, viso, barba, baffi, corona
    const HAIR = '#7a4a26';
    g.beginPath(); g.rect(111, 116, 18, 22); fs(g, SKIN);
    ell(g, 120, 97, 27, 27); fs(g, HAIR);
    ell(g, 120, 100, 21, 24); fs(g, SKIN);
    circ(g, 108, 104, 4.5); circ(g, 132, 104, 4.5); g.fillStyle = 'rgba(230,90,70,.28)'; g.fill();
    g.beginPath(); g.moveTo(99, 100); g.quadraticCurveTo(100, 130, 120, 149); g.quadraticCurveTo(140, 130, 141, 100); g.quadraticCurveTo(138, 121, 120, 121); g.quadraticCurveTo(102, 121, 99, 100); g.closePath(); fs(g, HAIR);
    g.beginPath(); g.moveTo(120, 108); g.quadraticCurveTo(110, 104, 102, 114); g.quadraticCurveTo(112, 111, 120, 111.5); g.quadraticCurveTo(128, 111, 138, 114); g.quadraticCurveTo(130, 104, 120, 108); g.closePath(); fs(g, HAIR);
    g.beginPath(); g.moveTo(116, 116); g.quadraticCurveTo(120, 118, 124, 116); g.strokeStyle = '#9a3a2a'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = INK; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(120, 95); g.quadraticCurveTo(116, 103, 121, 104.5); g.stroke();
    g.beginPath(); g.moveTo(106, 88); g.lineTo(116, 86.5); g.moveTo(124, 86.5); g.lineTo(134, 88); g.lineWidth = 2.4; g.stroke();
    g.fillStyle = INK; ell(g, 111.5, 94, 2.3, 3); g.fill(); ell(g, 128.5, 94, 2.3, 3); g.fill();
    g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(98, 82); g.lineTo(98, 58); g.lineTo(105, 69); g.lineTo(110, 52); g.lineTo(116, 66); g.lineTo(120, 47); g.lineTo(124, 66); g.lineTo(130, 52); g.lineTo(135, 69); g.lineTo(142, 58); g.lineTo(142, 82); g.closePath(); fs(g, goldH(g, 98, 142));
    for (const [x, y] of [[98, 58], [110, 52], [120, 47], [130, 52], [142, 58]]) { circ(g, x, y, 3); fs(g, '#f7c93a'); }
    g.beginPath(); g.moveTo(98, 73); g.lineTo(142, 73); g.stroke();
    circ(g, 108, 77.5, 3); fs(g, RED); circ(g, 120, 77.5, 3.4); fs(g, T.cape); circ(g, 132, 77.5, 3); fs(g, RED);
  }
  // FANTE: ragazzo in piedi, berretto con la piuma, tunica corta e calzamaglia; tiene il simbolo con la destra, l'altra mano sul fianco
  const HAIRS = { d: '#d9a441', c: '#5a3418', s: '#2e2018', b: '#b5652a' };
  function fante(g, su) {
    const T = THEME[su], HAIR = HAIRS[su];
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 2.6;
    ell(g, 120, 360, 52, 7); g.fillStyle = 'rgba(70,45,20,.16)'; g.fill();
    // gambe e scarpe
    for (const x of [108, 132]) { g.beginPath(); g.moveTo(x - 7, 262); g.lineTo(x - 6, 350); g.lineTo(x + 6, 350); g.lineTo(x + 7, 262); g.closePath(); fs(g, x < 120 ? T.cape : '#f2c230'); }
    ell(g, 104, 355, 12, 6); fs(g, '#5a2a14'); ell(g, 136, 355, 12, 6); fs(g, '#5a2a14');
    // mantellina dietro
    g.beginPath(); g.moveTo(96, 146); g.bezierCurveTo(80, 190, 74, 240, 78, 262); g.lineTo(162, 262); g.bezierCurveTo(166, 240, 160, 190, 144, 146); g.closePath(); fs(g, T.cape);
    // tunica
    const tun = () => { g.beginPath(); g.moveTo(104, 136); g.bezierCurveTo(92, 140, 88, 150, 88, 160); g.bezierCurveTo(88, 210, 82, 250, 80, 278); g.quadraticCurveTo(100, 288, 120, 280); g.quadraticCurveTo(140, 288, 160, 278); g.bezierCurveTo(158, 250, 152, 210, 152, 160); g.bezierCurveTo(152, 150, 148, 140, 136, 136); g.closePath(); };
    tun(); g.fillStyle = T.robe; g.fill();
    g.save(); tun(); g.clip();
    g.fillStyle = 'rgba(0,0,0,.13)'; g.fillRect(138, 120, 40, 180);
    g.fillStyle = '#f2c230'; g.fillRect(114, 140, 12, 150); g.beginPath(); g.moveTo(114, 140); g.lineTo(114, 290); g.moveTo(126, 140); g.lineTo(126, 290); g.stroke();
    for (const y of [165, 185, 232, 252]) { circ(g, 120, y, 3); fs(g, T.cape); }
    g.fillStyle = '#7a4a26'; g.fillRect(70, 203, 100, 10); g.beginPath(); g.moveTo(70, 203); g.lineTo(170, 203); g.moveTo(70, 213); g.lineTo(170, 213); g.stroke();
    g.fillStyle = '#f2c230'; g.fillRect(70, 266, 100, 30); g.beginPath(); g.moveTo(70, 266); g.lineTo(170, 266); g.stroke();
    g.restore(); tun(); g.stroke();
    rr(g, 113, 200, 14, 16, 3); fs(g, '#f2c230');
    // braccia
    sleeve(g, [[98, 156], [82, 184], [78, 204]], T.robe);
    item(g, su, 78, 213, 150);
    cuff(g, 78, 204); hand(g, 78, 213);
    sleeve(g, [[142, 156], [164, 182], [152, 204]], T.robe);
    cuff(g, 154, 202); hand(g, 150, 209);
    // colletto bianco
    g.beginPath(); g.moveTo(100, 142); g.quadraticCurveTo(120, 158, 140, 142); g.quadraticCurveTo(141, 152, 132, 156); g.quadraticCurveTo(120, 162, 108, 156); g.quadraticCurveTo(99, 152, 100, 142); g.closePath(); fs(g, '#fffaf0');
    // testa
    g.beginPath(); g.rect(112, 118, 16, 24); fs(g, SKIN);
    g.beginPath(); g.moveTo(96, 96); g.bezierCurveTo(94, 120, 100, 130, 106, 128); g.lineTo(134, 128); g.bezierCurveTo(140, 130, 146, 120, 144, 96); g.closePath(); fs(g, HAIR);
    ell(g, 120, 104, 19, 22); fs(g, SKIN);
    g.beginPath(); g.moveTo(100, 100); g.quadraticCurveTo(104, 82, 120, 82); g.quadraticCurveTo(138, 82, 141, 100); g.quadraticCurveTo(130, 92, 118, 94); g.quadraticCurveTo(108, 95, 100, 100); g.closePath(); fs(g, HAIR);
    eyes(g, 120, 103, 8);
    g.strokeStyle = INK; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(120, 104); g.quadraticCurveTo(117, 111, 121, 112); g.stroke();
    g.beginPath(); g.moveTo(114, 117); g.quadraticCurveTo(120, 121, 126, 117); g.strokeStyle = '#9a3a2a'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = INK; g.lineWidth = 2.6;
    // berretto con la piuma
    g.beginPath(); g.moveTo(149, 70); g.bezierCurveTo(172, 52, 176, 34, 168, 26); g.bezierCurveTo(162, 44, 152, 58, 140, 68); g.closePath(); fs(g, '#fffaf0');
    g.beginPath(); g.moveTo(154, 66); g.quadraticCurveTo(164, 48, 168, 28); g.lineWidth = 1.4; g.stroke(); g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(96, 88); g.bezierCurveTo(92, 64, 150, 56, 150, 80); g.quadraticCurveTo(122, 76, 96, 88); g.closePath(); fs(g, T.cape);
    ell(g, 122, 84, 29, 6.5, -0.12); fs(g, '#f2c230');
  }

  // CAVALLO: cavaliere su un cavallo di profilo (verso sinistra), che alza il simbolo del seme
  const HORSE = { d: ['#f4efe6', '#d8d0c2', '#cfc6b6'], c: ['#a0642e', '#7d4a1f', '#3a2414'], s: ['#e6e8ec', '#c4c8cf', '#8f949c'], b: ['#6b4226', '#4f2f1a', '#2a1a10'] };
  function cavallo(g, su) {
    const T = THEME[su], [HC, HD, MANE] = HORSE[su];
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 2.6;
    ell(g, 128, 360, 78, 7); g.fillStyle = 'rgba(70,45,20,.16)'; g.fill();
    const leg = (pts, col) => {
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) g.lineTo(q[0], q[1]);
      g.lineWidth = 15; g.strokeStyle = INK; g.stroke(); g.lineWidth = 10.5; g.strokeStyle = col; g.stroke(); g.lineWidth = 2.6; g.strokeStyle = INK;
      const h = pts[pts.length - 1]; rr(g, h[0] - 7, h[1] - 2, 14, 8, 2.5); fs(g, '#3a2a1e');
    };
    // zampe dietro (piu' scure)
    leg([[100, 268], [92, 306], [94, 344]], HD);
    leg([[172, 262], [182, 300], [170, 344]], HD);
    // coda
    g.beginPath(); g.moveTo(186, 236); g.bezierCurveTo(212, 250, 200, 290, 214, 316); g.bezierCurveTo(196, 300, 196, 270, 182, 252); g.closePath(); fs(g, MANE);
    // corpo e collo
    g.beginPath(); g.moveTo(86, 236); g.bezierCurveTo(90, 214, 120, 218, 150, 220); g.bezierCurveTo(176, 218, 196, 230, 192, 254); g.bezierCurveTo(190, 276, 168, 280, 150, 276); g.lineTo(108, 278); g.bezierCurveTo(90, 278, 82, 260, 86, 236); g.closePath(); fs(g, HC);
    g.beginPath(); g.moveTo(84, 250); g.bezierCurveTo(74, 226, 64, 206, 58, 190); g.lineTo(84, 170); g.bezierCurveTo(96, 190, 108, 208, 118, 222); g.closePath(); fs(g, HC);
    // testa
    g.beginPath(); g.moveTo(60, 178); g.bezierCurveTo(68, 166, 84, 164, 90, 176); g.bezierCurveTo(88, 186, 74, 200, 62, 214); g.bezierCurveTo(56, 222, 42, 222, 40, 214); g.bezierCurveTo(38, 206, 48, 192, 60, 178); g.closePath(); fs(g, HC);
    g.beginPath(); g.moveTo(76, 168); g.lineTo(80, 152); g.lineTo(88, 170); g.closePath(); fs(g, HC);
    circ(g, 70, 182, 2.6); g.fillStyle = INK; g.fill();
    circ(g, 46, 214, 1.8); g.fill();
    // criniera
    g.beginPath(); g.moveTo(84, 168); g.bezierCurveTo(98, 176, 104, 196, 120, 220); g.bezierCurveTo(110, 214, 104, 212, 98, 206); g.bezierCurveTo(98, 198, 90, 192, 86, 186); g.bezierCurveTo(84, 180, 78, 176, 84, 168); g.closePath(); fs(g, MANE);
    // briglie
    g.strokeStyle = '#7a1e14'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(52, 206); g.lineTo(74, 186); g.lineTo(84, 172); g.moveTo(50, 208); g.quadraticCurveTo(84, 226, 122, 206); g.stroke(); g.strokeStyle = INK; g.lineWidth = 2.6;
    // zampe davanti: una alzata, come sulle carte vere
    leg([[110, 270], [98, 296], [84, 300], [80, 318]], HC);
    leg([[160, 270], [154, 306], [160, 346]], HC);
    // gualdrappa (coperta della sella) col bordo d'oro e le frange
    g.beginPath(); g.moveTo(118, 220); g.lineTo(168, 222); g.lineTo(172, 282); g.lineTo(116, 282); g.closePath(); fs(g, T.cape);
    g.fillStyle = '#f2c230'; g.fillRect(116, 274, 56, 8); g.beginPath(); g.moveTo(116, 274); g.lineTo(172, 274); g.stroke();
    for (let x = 120; x <= 168; x += 8) { g.beginPath(); g.moveTo(x, 283); g.lineTo(x, 290); g.strokeStyle = '#c99a1a'; g.lineWidth = 2.4; g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 2.6;
    // cavaliere: busto, gamba, braccia
    const tor = () => { g.beginPath(); g.moveTo(130, 140); g.bezierCurveTo(118, 144, 116, 160, 118, 176); g.lineTo(122, 230); g.lineTo(162, 230); g.lineTo(164, 176); g.bezierCurveTo(166, 160, 162, 144, 150, 140); g.closePath(); };
    tor(); g.fillStyle = T.robe; g.fill();
    g.save(); tor(); g.clip(); g.fillStyle = 'rgba(0,0,0,.13)'; g.fillRect(152, 130, 20, 110); g.fillStyle = '#f2c230'; g.fillRect(134, 140, 12, 95); g.fillRect(110, 204, 70, 9); g.beginPath(); g.moveTo(134, 140); g.lineTo(134, 235); g.moveTo(146, 140); g.lineTo(146, 235); g.moveTo(110, 204); g.lineTo(180, 204); g.moveTo(110, 213); g.lineTo(180, 213); g.stroke(); g.restore(); tor(); g.stroke();
    g.beginPath(); g.moveTo(132, 226); g.lineTo(122, 256); g.lineTo(128, 288);
    g.lineWidth = 19; g.strokeStyle = INK; g.stroke(); g.lineWidth = 14; g.strokeStyle = T.cape === RED ? '#f2c230' : RED; g.stroke(); g.lineWidth = 2.6; g.strokeStyle = INK;
    g.beginPath(); g.moveTo(118, 282); g.lineTo(140, 282); g.quadraticCurveTo(144, 298, 132, 300); g.lineTo(118, 300); g.closePath(); fs(g, '#5a2a14');
    sleeve(g, [[146, 156], [154, 186], [128, 204]], T.robe); hand(g, 122, 206);
    sleeve(g, [[132, 152], [108, 150], [94, 128]], T.robe);
    item(g, su, 92, 120, 100);
    cuff(g, 94, 130); hand(g, 92, 120);
    // testa con l'elmo e il pennacchio
    g.beginPath(); g.rect(132, 116, 16, 24); fs(g, SKIN);
    ell(g, 140, 104, 18, 20); fs(g, SKIN);
    eyes(g, 140, 103, 7.5);
    g.strokeStyle = INK; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(140, 104); g.quadraticCurveTo(137, 110, 141, 111); g.stroke();
    g.beginPath(); g.moveTo(132, 115); g.quadraticCurveTo(136, 112, 140, 114); g.quadraticCurveTo(144, 112, 148, 115); g.lineWidth = 3; g.strokeStyle = '#4a2a14'; g.stroke();
    g.strokeStyle = INK; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(152, 76); g.bezierCurveTo(176, 62, 184, 76, 192, 96); g.bezierCurveTo(176, 84, 166, 84, 156, 90); g.closePath(); fs(g, T.cape);
    const hg = g.createLinearGradient(120, 0, 160, 0); hg.addColorStop(0, '#f4f7fb'); hg.addColorStop(.5, '#c6ceda'); hg.addColorStop(1, '#8b95a5');
    g.beginPath(); g.moveTo(120, 98); g.bezierCurveTo(118, 70, 162, 66, 160, 98); g.closePath(); fs(g, hg);
    g.beginPath(); g.rect(118, 94, 44, 8); fs(g, '#f2c230');
    g.beginPath(); g.moveTo(140, 72); g.lineTo(140, 94); g.stroke();
  }
  const FIG = { 8: fante, 9: cavallo, 10: re };

  // ---- la carta ----
  function paper(g) {
    rr(g, 1, 1, W - 2, H - 2, 16);
    const q = g.createRadialGradient(120, 190, 60, 120, 200, 260); q.addColorStop(0, '#fffbf0'); q.addColorStop(1, '#f1e6c8');
    g.fillStyle = q; g.fill(); g.lineWidth = 2; g.strokeStyle = '#bfa877'; g.stroke();
    rr(g, 8, 8, W - 16, H - 16, 11); g.lineWidth = 1.2; g.strokeStyle = '#dcc89c'; g.stroke();
  }
  function index(g, su, r) {
    for (const flip of [0, 1]) {
      g.save(); if (flip) { g.translate(W, H); g.rotate(Math.PI); }
      g.fillStyle = SUIT[su].ink; g.font = 'bold 44px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText(LAB[r], 29, 53);
      pip(g, su, 29, 77, su === 'd' ? 25 : 32);
      g.restore();
    }
  }
  function canvas(pw) {
    const c = document.createElement('canvas'); c.width = pw; c.height = Math.round(pw * H / W);
    const g = c.getContext('2d', CPU); g.scale(pw / W, c.height / H); K = pw / W; return [c, g];
  }
  function card(su, r, pw, tmp) {
    pw = Math.max(16, Math.round(pw)); const key = su + r + '_' + pw; let c = cache.get(key); if (c) return c;
    const [cv, g] = canvas(pw);
    paper(g);
    if (r === 1) asso(g, su);
    else if (r <= 7) for (const [x, y] of LAY[r]) pip(g, su, x, y, PS[r] * PK[su]);
    else FIG[r](g, su, r);
    index(g, su, r);
    if (!tmp) cache.set(key, cv); return cv;
  }
  function back(pw, tmp) {
    pw = Math.max(16, Math.round(pw)); const key = 'back_' + pw; let c = cache.get(key); if (c) return c;
    const [cv, g] = canvas(pw);
    rr(g, 1, 1, W - 2, H - 2, 16); g.fillStyle = '#fdf8ec'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#bfa877'; g.stroke();
    rr(g, 12, 12, W - 24, H - 24, 10); g.fillStyle = '#a51d18'; g.fill();
    g.save(); g.clip();
    const lines = () => { g.beginPath(); for (let d = -H; d < W + H; d += 24) { g.moveTo(d, 0); g.lineTo(d + H, H); g.moveTo(d, H); g.lineTo(d + H, 0); } };
    lines(); g.strokeStyle = '#7c120e'; g.lineWidth = 5; g.stroke();
    lines(); g.strokeStyle = '#e2b450'; g.lineWidth = 1.3; g.stroke();
    g.fillStyle = '#ffd877'; for (let a = 0; a * 12 <= W + 12; a++) for (let b = 0; b * 12 <= H + 12; b++) if ((a + b) % 2 === 0) { circ(g, a * 12, b * 12 + (H % 24 === 0 ? 0 : 0), 2.1); g.fill(); }
    g.restore();
    rr(g, 12, 12, W - 24, H - 24, 10); g.lineWidth = 2.5; g.strokeStyle = '#e2b450'; g.stroke();
    ell(g, 120, 200, 58, 82); g.fillStyle = '#fdf8ec'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#d8a332'; g.stroke();
    ell(g, 120, 200, 50, 74); g.lineWidth = 1.5; g.strokeStyle = '#a51d18'; g.stroke();
    pip(g, 'd', 120, 200, 76);
    if (!tmp) cache.set(key, cv); return cv;
  }
  // la carta come immagine (data URL): per i tavoli fatti di <img>; la tela si butta subito (sul telefono 40 tele grandi pesano troppo)
  const urls = new Map();
  function url(su, r, pw) {
    pw = Math.max(16, Math.round(pw)); const k = (r ? su + r : 'back') + '_' + pw; let u = urls.get(k); if (u) return u;
    u = (r ? card(su, r, pw, true) : back(pw, true)).toDataURL('image/png'); urls.set(k, u); return u;
  }
  // ======== CARTE FRANCESI A 4 COLORI (Poker): CARTE.fr ========
  // Semi: 'h' cuori (rosso), 'd' quadri (blu), 'c' fiori (verde), 's' picche (nero). Valori 2..14 (11 J, 12 Q, 13 K, 14 A).
  // Carta logica FW x FH (proporzioni delle carte da poker). Simboli pieni e netti come il poker online, figure disegnate da noi
  // a mezzo busto con la doppia testa (stesso tratto delle figure napoletane). j = "jumbo": numero enorme + seme grande, per le carte piccole.
  const FW = 250, FH = 350;
  const FRC = { h: ['#ff5d63', '#c8102e', '#8e0b20'], d: ['#5a98ff', '#1554c0', '#0e3a86'], c: ['#46c467', '#17803a', '#0f5726'], s: ['#5b616d', '#1b1d22', '#0c0d10'] };
  const FRL = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  function frShape(g, su) {
    g.beginPath();
    if (su === 'h') { g.moveTo(0, 47); g.bezierCurveTo(-18, 30, -50, 8, -50, -18); g.bezierCurveTo(-50, -38, -37, -49, -24, -49); g.bezierCurveTo(-12, -49, -4, -41, 0, -30); g.bezierCurveTo(4, -41, 12, -49, 24, -49); g.bezierCurveTo(37, -49, 50, -38, 50, -18); g.bezierCurveTo(50, 8, 18, 30, 0, 47); }
    else if (su === 'd') { g.moveTo(0, -50); g.bezierCurveTo(10, -30, 24, -14, 39, 0); g.bezierCurveTo(24, 14, 10, 30, 0, 50); g.bezierCurveTo(-10, 30, -24, 14, -39, 0); g.bezierCurveTo(-24, -14, -10, -30, 0, -50); }
    else if (su === 's') { g.moveTo(0, -50); g.bezierCurveTo(10, -30, 48, -14, 48, 10); g.bezierCurveTo(48, 27, 35, 35, 23, 35); g.bezierCurveTo(13, 35, 6, 30, 3, 25); g.quadraticCurveTo(5, 41, 17, 50); g.lineTo(-17, 50); g.quadraticCurveTo(-5, 41, -3, 25); g.bezierCurveTo(-6, 30, -13, 35, -23, 35); g.bezierCurveTo(-35, 35, -48, 27, -48, 10); g.bezierCurveTo(-48, -14, -10, -30, 0, -50); }
    else {
      for (const [x, y, r] of [[0, -25, 21.5], [-24.5, 6, 21.5], [24.5, 6, 21.5], [0, -1, 13]]) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
      g.moveTo(-3.5, 6); g.quadraticCurveTo(-4, 38, -17, 50); g.lineTo(17, 50); g.quadraticCurveTo(4, 38, 3.5, 6); g.closePath();
    }
  }
  // un seme pieno alto s, centrato in (x, y); flip = capovolto (meta' bassa della carta)
  function frPip(g, su, x, y, s, flip, flat) {
    g.save(); g.translate(x, y); if (flip) g.rotate(Math.PI); g.scale(s / 100, s / 100);
    const [lt, md, dk] = FRC[su];
    frShape(g, su);
    if (flat) g.fillStyle = md;
    else { const q = g.createLinearGradient(-30, -50, 30, 50); q.addColorStop(0, lt); q.addColorStop(.45, md); q.addColorStop(1, dk); g.fillStyle = q; }
    g.fill();
    if (!flat && s * K >= 26) {   // riflesso morbido in alto a sinistra
      g.save(); frShape(g, su); g.clip();
      ell(g, -20, -26, 17, 11, -0.6); g.fillStyle = 'rgba(255,255,255,.26)'; g.fill();
      g.restore();
    }
    g.restore();
  }
  // disposizione dei semi 2..10 (colonne 80/125/170, righe dall'alto 72 al basso 278)
  const FC = [80, 125, 170], FY = { t: 72, b: 278, m: 175, q1: 123.5, q3: 226.5, r1: 140.7, r2: 209.3, h1: 106.3, h3: 243.7 };
  const FLAY = {
    2: [[1, 't'], [1, 'b']], 3: [[1, 't'], [1, 'm'], [1, 'b']],
    4: [[0, 't'], [2, 't'], [0, 'b'], [2, 'b']], 5: [[0, 't'], [2, 't'], [1, 'm'], [0, 'b'], [2, 'b']],
    6: [[0, 't'], [2, 't'], [0, 'm'], [2, 'm'], [0, 'b'], [2, 'b']],
    7: [[0, 't'], [2, 't'], [1, 'q1'], [0, 'm'], [2, 'm'], [0, 'b'], [2, 'b']],
    8: [[0, 't'], [2, 't'], [1, 'q1'], [0, 'm'], [2, 'm'], [1, 'q3'], [0, 'b'], [2, 'b']],
    9: [[0, 't'], [2, 't'], [0, 'r1'], [2, 'r1'], [1, 'm'], [0, 'r2'], [2, 'r2'], [0, 'b'], [2, 'b']],
    10: [[0, 't'], [2, 't'], [1, 'h1'], [0, 'r1'], [2, 'r1'], [0, 'r2'], [2, 'r2'], [1, 'h3'], [0, 'b'], [2, 'b']],
  };
  const FPS = { 2: 50, 3: 50, 4: 50, 5: 50, 6: 48, 7: 46, 8: 46, 9: 42, 10: 40 };
  function frPaper(g) {
    rr(g, 1, 1, FW - 2, FH - 2, 17);
    const q = g.createLinearGradient(0, 0, FW, FH); q.addColorStop(0, '#ffffff'); q.addColorStop(1, '#f2f0ea');
    g.fillStyle = q; g.fill(); g.lineWidth = 2; g.strokeStyle = '#c9c4b6'; g.stroke();
  }
  function frRank(g, su, r, x, y, px) {   // numero/lettera centrato in x, base in y, alto circa px
    g.save(); g.fillStyle = FRC[su][1]; g.font = `800 ${px}px system-ui, "Segoe UI", Roboto, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const t = FRL[r], w = g.measureText(t).width, max = px * (t.length > 1 ? .95 : .78);
    g.translate(x, y); if (w > max) g.scale(max / w, 1); g.fillText(t, 0, 0); g.restore();
  }
  function frIndex(g, su, r) {
    for (const flip of [0, 1]) {
      g.save(); if (flip) { g.translate(FW, FH); g.rotate(Math.PI); }
      frRank(g, su, r, 31, 64, 54);
      frPip(g, su, 31, 91, 32, false, true);
      g.restore();
    }
  }
  // ---- figure: mezzo busto nella meta' alta del riquadro (48..202 x 38..175), poi la stessa capovolta sotto ----
  const FT = { h: ['#d3263a', '#8e1022', '#1554c0'], d: ['#2a6fd6', '#163f8a', '#d3263a'], c: ['#23944a', '#145c2c', '#d3263a'], s: ['#3a3f4a', '#1b1d22', '#d3263a'] };
  const FHAIR = { K: { h: '#8a8f99', d: '#6b3f1f', c: '#3a2618', s: '#b9bdc4' }, Q: { h: '#e2b04a', d: '#7a3a1a', c: '#2e2018', s: '#b5652a' }, J: { h: '#3a2618', d: '#d9a441', c: '#b5652a', s: '#5a3418' } };
  function frFace(g, cx, cy, kind) {
    g.strokeStyle = INK; g.lineWidth = 2.4;
    ell(g, cx, cy, 19, 22); fs(g, SKIN);
    g.fillStyle = INK; ell(g, cx - 7.5, cy - 2, 2.2, 2.9); g.fill(); ell(g, cx + 7.5, cy - 2, 2.2, 2.9); g.fill();
    circ(g, cx - 11, cy + 7, 4.2); circ(g, cx + 11, cy + 7, 4.2); g.fillStyle = 'rgba(230,90,70,.28)'; g.fill();
    g.lineWidth = 1.8; g.beginPath(); g.moveTo(cx, cy - 1); g.quadraticCurveTo(cx - 3, cy + 6, cx + 1, cy + 7); g.stroke();
    if (kind === 'Q') {   // ciglia e labbra
      g.beginPath(); g.moveTo(cx - 11, cy - 6); g.lineTo(cx - 13, cy - 8); g.moveTo(cx + 11, cy - 6); g.lineTo(cx + 13, cy - 8); g.stroke();
      ell(g, cx, cy + 13, 4.5, 2.4); g.fillStyle = '#d23a4a'; g.fill();
    } else if (kind === 'J') { g.beginPath(); g.moveTo(cx - 5, cy + 12); g.quadraticCurveTo(cx, cy + 16, cx + 5, cy + 12); g.strokeStyle = '#9a3a2a'; g.lineWidth = 2; g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 2.6;
  }
  function frBust(g, su, kind) {
    const [robe, dark, alt] = FT[su], HAIR = FHAIR[kind][su], GOLD = '#f2c230';
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 2.6;
    const cx = 125, cy = 86;
    // capelli dietro (la regina li ha lunghi fino alle spalle)
    if (kind === 'Q') { g.beginPath(); g.moveTo(102, 80); g.bezierCurveTo(96, 110, 94, 136, 100, 150); g.lineTo(150, 150); g.bezierCurveTo(156, 136, 154, 110, 148, 80); g.closePath(); fs(g, HAIR); }
    // spalle e veste
    const robeP = () => { g.beginPath(); g.moveTo(52, 180); g.bezierCurveTo(54, 146, 78, 126, 106, 121); g.lineTo(144, 121); g.bezierCurveTo(172, 126, 196, 146, 198, 180); g.closePath(); };
    robeP(); g.fillStyle = robe; g.fill();
    g.save(); robeP(); g.clip();
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(148, 110, 70, 80);
    if (kind === 'K') { g.fillStyle = GOLD; g.fillRect(117, 120, 16, 70); g.beginPath(); g.moveTo(117, 120); g.lineTo(117, 190); g.moveTo(133, 120); g.lineTo(133, 190); g.stroke(); }
    if (kind === 'J') { g.fillStyle = GOLD; for (const x of [84, 108, 132, 156]) { g.fillRect(x, 120, 10, 70); g.beginPath(); g.moveTo(x, 120); g.lineTo(x, 190); g.moveTo(x + 10, 120); g.lineTo(x + 10, 190); g.stroke(); } }
    if (kind === 'Q') { g.fillStyle = alt; g.beginPath(); g.moveTo(100, 121); g.lineTo(150, 121); g.lineTo(146, 152); g.lineTo(104, 152); g.closePath(); g.fill(); g.stroke(); }
    g.restore(); robeP(); g.stroke();
    // collo
    g.beginPath(); g.rect(115, 102, 20, 22); fs(g, SKIN);
    if (kind === 'Q') {   // scollatura con il bordo d'oro e la collana di perle
      g.beginPath(); g.moveTo(108, 121); g.lineTo(142, 121); g.lineTo(138, 140); g.lineTo(112, 140); g.closePath(); fs(g, SKIN);
      g.strokeStyle = GOLD; g.lineWidth = 3.5; g.beginPath(); g.moveTo(106, 120); g.lineTo(111, 142); g.lineTo(139, 142); g.lineTo(144, 120); g.stroke(); g.strokeStyle = INK; g.lineWidth = 2.6;
      g.fillStyle = '#fffaf0'; for (let i = 0; i <= 8; i++) { const a = Math.PI * (.15 + .7 * i / 8); circ(g, cx + Math.cos(a) * 15, 117 + Math.sin(a) * 9, 2.4); g.fill(); g.lineWidth = 1; g.stroke(); }
      g.lineWidth = 2.6;
    }
    // collo della veste: ermellino per il re, colletto bianco per il fante
    if (kind === 'K') {
      g.beginPath(); g.moveTo(80, 132); g.quadraticCurveTo(125, 104, 170, 132); g.quadraticCurveTo(176, 148, 164, 152); g.quadraticCurveTo(125, 134, 86, 152); g.quadraticCurveTo(74, 148, 80, 132); g.closePath(); fs(g, '#fffaf0');
      ermine(g, 90, 162, 132, 2);
    } else if (kind === 'J') {
      g.beginPath(); g.moveTo(104, 124); g.quadraticCurveTo(125, 140, 146, 124); g.quadraticCurveTo(150, 134, 140, 140); g.quadraticCurveTo(125, 146, 110, 140); g.quadraticCurveTo(100, 134, 104, 124); g.closePath(); fs(g, '#fffaf0');
    }
    // stemma del seme sul petto
    circ(g, cx, 163, 12); fs(g, goldH(g, cx - 12, cx + 12));
    frPip(g, su, cx, 163, 14, false, true);
    // cosa tiene in mano
    if (kind === 'K') {   // spada dritta a sinistra
      const bl = g.createLinearGradient(66, 0, 78, 0); bl.addColorStop(0, '#eef6ff'); bl.addColorStop(.45, '#b9cbe2'); bl.addColorStop(1, '#5f7390');
      g.beginPath(); g.moveTo(72, 42); g.lineTo(78, 54); g.lineTo(78, 136); g.lineTo(66, 136); g.lineTo(66, 54); g.closePath(); fs(g, bl);
      g.beginPath(); g.moveTo(72, 56); g.lineTo(72, 132); g.lineWidth = 1.6; g.strokeStyle = '#5f7390'; g.stroke(); g.strokeStyle = INK; g.lineWidth = 2.6;
      rr(g, 54, 135, 36, 7, 3.5); fs(g, goldH(g, 54, 90));
      sleeve(g, [[96, 136], [80, 150], [74, 158]], robe);
      cuff(g, 74, 157); hand(g, 72, 150);
    } else if (kind === 'Q') {   // un fiore del colore del seme
      g.beginPath(); g.moveTo(150, 152); g.quadraticCurveTo(162, 120, 168, 92); g.strokeStyle = '#2f7a34'; g.lineWidth = 3; g.stroke();
      ell(g, 160, 118, 7, 3.5, -0.9); g.fillStyle = '#4fa548'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.8; g.stroke(); g.lineWidth = 2.6;
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; circ(g, 168 + Math.cos(a) * 7, 88 + Math.sin(a) * 7, 6.5); fs(g, FRC[su][0]); }
      circ(g, 168, 88, 4.5); fs(g, GOLD);
      sleeve(g, [[150, 132], [158, 148], [152, 156]], robe);
      cuff(g, 153, 152); hand(g, 152, 146);
    } else {   // alabarda a destra
      g.beginPath(); g.rect(175, 40, 6, 140); fs(g, '#8a5a2c');
      g.beginPath(); g.moveTo(178, 30); g.lineTo(184, 46); g.lineTo(172, 46); g.closePath(); fs(g, '#c6ceda');
      g.beginPath(); g.moveTo(181, 50); g.bezierCurveTo(200, 50, 202, 72, 196, 80); g.bezierCurveTo(192, 70, 186, 68, 181, 70); g.closePath(); fs(g, '#c6ceda');
      g.beginPath(); g.moveTo(175, 54); g.lineTo(164, 60); g.lineTo(175, 64); g.closePath(); fs(g, '#c6ceda');
      sleeve(g, [[154, 134], [170, 146], [176, 154]], robe);
      cuff(g, 176, 154); hand(g, 178, 146);
    }
    // testa
    if (kind === 'K') { g.beginPath(); g.moveTo(104, 84); g.bezierCurveTo(98, 70, 108, 56, 125, 56); g.bezierCurveTo(142, 56, 152, 70, 146, 84); g.closePath(); fs(g, HAIR); }
    frFace(g, cx, cy, kind);
    if (kind === 'K') {   // barba, baffi e corona
      g.beginPath(); g.moveTo(106, 88); g.quadraticCurveTo(106, 116, 125, 124); g.quadraticCurveTo(144, 116, 144, 88); g.quadraticCurveTo(140, 104, 125, 104); g.quadraticCurveTo(110, 104, 106, 88); g.closePath(); fs(g, HAIR);
      g.beginPath(); g.moveTo(125, 95); g.quadraticCurveTo(115, 91, 108, 100); g.quadraticCurveTo(117, 98, 125, 98.5); g.quadraticCurveTo(133, 98, 142, 100); g.quadraticCurveTo(135, 91, 125, 95); g.closePath(); fs(g, HAIR);
      g.beginPath(); g.moveTo(103, 70); g.lineTo(103, 46); g.lineTo(110, 57); g.lineTo(115, 40); g.lineTo(121, 54); g.lineTo(125, 35); g.lineTo(129, 54); g.lineTo(135, 40); g.lineTo(140, 57); g.lineTo(147, 46); g.lineTo(147, 70); g.closePath(); fs(g, goldH(g, 103, 147));
      for (const [x, y] of [[103, 46], [115, 40], [125, 35], [135, 40], [147, 46]]) { circ(g, x, y, 2.8); fs(g, '#f7c93a'); }
      g.beginPath(); g.moveTo(103, 62); g.lineTo(147, 62); g.stroke();
      circ(g, 113, 66, 2.8); fs(g, alt); circ(g, 125, 66, 3.2); fs(g, robe); circ(g, 137, 66, 2.8); fs(g, alt);
    } else if (kind === 'Q') {   // capelli sopra e diadema
      g.beginPath(); g.moveTo(105, 84); g.bezierCurveTo(102, 62, 116, 58, 125, 62); g.bezierCurveTo(134, 58, 148, 62, 145, 84); g.quadraticCurveTo(136, 72, 125, 72); g.quadraticCurveTo(114, 72, 105, 84); g.closePath(); fs(g, HAIR);
      g.beginPath(); g.moveTo(108, 66); g.lineTo(110, 52); g.lineTo(117, 60); g.lineTo(125, 46); g.lineTo(133, 60); g.lineTo(140, 52); g.lineTo(142, 66); g.quadraticCurveTo(125, 60, 108, 66); g.closePath(); fs(g, goldH(g, 108, 142));
      circ(g, 125, 46, 3); fs(g, '#fffaf0'); circ(g, 125, 59, 3); fs(g, robe);
    } else {   // ciuffo e berretto con la piuma
      g.beginPath(); g.moveTo(106, 84); g.bezierCurveTo(104, 66, 116, 62, 128, 64); g.bezierCurveTo(140, 64, 148, 72, 145, 86); g.quadraticCurveTo(132, 74, 118, 76); g.quadraticCurveTo(110, 77, 106, 84); g.closePath(); fs(g, HAIR);
      g.beginPath(); g.moveTo(150, 60); g.bezierCurveTo(172, 44, 176, 28, 168, 20); g.bezierCurveTo(162, 36, 152, 48, 140, 58); g.closePath(); fs(g, '#fffaf0');
      g.beginPath(); g.moveTo(154, 56); g.quadraticCurveTo(164, 40, 168, 22); g.lineWidth = 1.4; g.stroke(); g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(102, 74); g.bezierCurveTo(98, 50, 152, 44, 150, 68); g.quadraticCurveTo(124, 64, 102, 74); g.closePath(); fs(g, dark);
      ell(g, 126, 70, 27, 6, -0.1); fs(g, GOLD);
    }
  }
  function frCourt(g, su, r) {
    const kind = r === 11 ? 'J' : r === 12 ? 'Q' : 'K', x0 = 48, y0 = 38, w = 154, h = 274;
    rr(g, x0, y0, w, h, 6); g.fillStyle = '#fffaf0'; g.fill();
    for (const flip of [0, 1]) {
      g.save(); if (flip) { g.translate(FW, FH); g.rotate(Math.PI); }
      g.beginPath(); g.rect(x0, y0, w, FH / 2 - y0); g.clip();
      g.fillStyle = FRC[su][1]; g.globalAlpha = .07; g.fillRect(x0, y0, w, h); g.globalAlpha = 1;
      frBust(g, su, kind);
      frPip(g, su, x0 + 15, y0 + 17, 20, false, true);
      g.restore();
    }
    g.beginPath(); g.moveTo(x0, FH / 2); g.lineTo(x0 + w, FH / 2); g.lineWidth = 2; g.strokeStyle = FRC[su][1]; g.stroke();
    rr(g, x0, y0, w, h, 6); g.lineWidth = 2.4; g.strokeStyle = FRC[su][1]; g.stroke();
    rr(g, x0 + 4, y0 + 4, w - 8, h - 8, 4); g.lineWidth = 1; g.stroke();
  }
  function frCanvas(pw) {
    const c = document.createElement('canvas'); c.width = pw; c.height = Math.round(pw * FH / FW);
    const g = c.getContext('2d', CPU); g.scale(pw / FW, c.height / FH); K = pw / FW; return [c, g];
  }
  // DUE COLORI (carte da scala classiche, per Cactus: o.c2): quadri rossi come i cuori, fiori neri come le picche
  function pal2(on, fn) {
    if (!on) return fn();
    const sv = [FRC.d, FRC.c, FT.d, FT.c]; FRC.d = FRC.h; FRC.c = FRC.s; FT.d = FT.h; FT.c = FT.s;
    try { return fn(); } finally { [FRC.d, FRC.c, FT.d, FT.c] = sv; }
  }
  // LA MATTA (jolly, r 15): giullare col cappello a tre punte e i sonagli; su 'x' rossa, 'y' nera
  function frJoker(g, su, big) {
    const A = su === 'y' ? ['#5b616d', '#1b1d22'] : ['#e8384a', '#a3122a'], GOLD = '#f2c230';
    const x0 = 40, y0 = 40, w = 170, h = 270;
    if (!big) {
      rr(g, x0, y0, w, h, 8); g.fillStyle = '#fffaf0'; g.fill();
      g.save(); g.fillStyle = A[1]; g.font = '800 23px system-ui, "Segoe UI", Roboto, Arial, sans-serif'; g.textAlign = 'center';
      for (const flip of [0, 1]) { g.save(); if (flip) { g.translate(FW, FH); g.rotate(Math.PI); } 'JOLLY'.split('').forEach((ch, i) => g.fillText(ch, 21, 36 + i * 23)); g.restore(); }
      g.restore();
    }
    g.save();
    if (!big) { rr(g, x0, y0, w, h, 8); g.clip(); g.fillStyle = A[1]; g.globalAlpha = .07; g.fillRect(x0, y0, w, h); g.globalAlpha = 1; }
    g.translate(125, big ? 186 : 182); const s = big ? 1.72 : 1.42; g.scale(s, s);
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 2.4 / s * 1.3;
    // spalle a due colori, con i rombi
    const body = () => { g.beginPath(); g.moveTo(-64, 90); g.bezierCurveTo(-62, 54, -42, 36, -16, 31); g.lineTo(16, 31); g.bezierCurveTo(42, 36, 62, 54, 64, 90); g.closePath(); };
    body(); g.fillStyle = A[0]; g.fill();
    g.save(); body(); g.clip(); g.fillStyle = GOLD; g.fillRect(0, 20, 80, 80);
    for (const [x, y, c] of [[-30, 60, GOLD], [30, 60, A[0]], [-14, 78, GOLD], [14, 78, A[0]]]) { g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 6, y); g.lineTo(x, y + 8); g.lineTo(x - 6, y); g.closePath(); g.fillStyle = c; g.fill(); g.stroke(); }
    g.restore(); body(); g.stroke();
    // collo e gorgiera a zig zag
    g.beginPath(); g.rect(-8, 14, 16, 16); fs(g, SKIN);
    g.beginPath(); for (let i = 0; i <= 12; i++) { const x = -36 + i * 6, y = i % 2 ? 40 : 24; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineTo(30, 30); g.quadraticCurveTo(0, 22, -30, 30); g.closePath(); fs(g, '#fffaf0');
    // viso col sorriso furbo
    ell(g, 0, 0, 19, 22); fs(g, SKIN);
    g.fillStyle = INK; ell(g, -7.5, -2, 2.2, 2.9); g.fill(); ell(g, 7.5, -2, 2.2, 2.9); g.fill();
    circ(g, -11, 7, 4.2); circ(g, 11, 7, 4.2); g.fillStyle = 'rgba(230,90,70,.3)'; g.fill();
    g.beginPath(); g.moveTo(-8, 10); g.quadraticCurveTo(0, 18, 9, 9); g.strokeStyle = '#9a3a2a'; g.lineWidth = 2; g.stroke(); g.strokeStyle = INK;
    // cappello a tre punte (colori alternati) con i sonagli d'oro
    const tips = [[-50, -2], [5, -66], [50, -2]];
    g.lineWidth = 2.4 / s * 1.3;
    g.beginPath(); g.moveTo(-21, -12); g.bezierCurveTo(-34, -42, -54, -34, -50, -2); g.bezierCurveTo(-44, -20, -30, -24, -8, -22); g.closePath(); fs(g, A[0]);
    g.beginPath(); g.moveTo(21, -12); g.bezierCurveTo(34, -42, 54, -34, 50, -2); g.bezierCurveTo(44, -20, 30, -24, 8, -22); g.closePath(); fs(g, A[0]);
    g.beginPath(); g.moveTo(-11, -20); g.bezierCurveTo(-14, -48, -4, -62, 5, -66); g.bezierCurveTo(3, -52, 11, -38, 11, -20); g.closePath(); fs(g, GOLD);
    ell(g, 0, -16, 23, 7); fs(g, GOLD);
    for (const [x, y] of tips) { circ(g, x, y, 5); fs(g, goldH(g, x - 5, x + 5)); }
    g.restore();
    if (!big) { rr(g, x0, y0, w, h, 8); g.lineWidth = 2.4; g.strokeStyle = A[1]; g.stroke(); }
  }
  function frCard(su, r, pw, o) {
    o = o || {}; pw = Math.max(16, Math.round(pw)); const key = 'fr' + su + r + (o.j ? 'j' : '') + (o.c2 ? 'c2' : '') + '_' + pw; let c = cache.get(key); if (c) return c;
    const cv = pal2(o.c2, () => frDraw(su, r, pw, o));
    if (!o.tmp) cache.set(key, cv); return cv;
  }
  function frDraw(su, r, pw, o) {
    const [cv, g] = frCanvas(pw);
    frPaper(g);
    if (r === 15) frJoker(g, su, o.j);
    else if (o.j) {   // jumbo: si legge anche piccolissima
      frRank(g, su, r, 70, 132, 132);
      if (r >= 11 && r <= 13) {   // il busto della figura in un riquadro in basso a destra
        rr(g, 112, 150, 118, 182, 8); g.fillStyle = '#fffaf0'; g.fill();
        g.save(); rr(g, 112, 150, 118, 182, 8); g.clip(); g.fillStyle = FRC[su][1]; g.globalAlpha = .07; g.fillRect(112, 150, 118, 182); g.globalAlpha = 1;
        g.translate(171 - 125 * 1.02, 160 - 38 * 1.02); g.scale(1.02, 1.02); frBust(g, su, r === 11 ? 'J' : r === 12 ? 'Q' : 'K'); g.restore();
        rr(g, 112, 150, 118, 182, 8); g.lineWidth = 2.4; g.strokeStyle = FRC[su][1]; g.stroke();
        frPip(g, su, 60, 196, 64);
      }
      else frPip(g, su, 166, 252, 122);
    } else {
      if (r === 14) {
        if (su === 's') { circ(g, 125, 175, 74); g.lineWidth = 2; g.strokeStyle = '#c9c4b6'; g.stroke(); circ(g, 125, 175, 68); g.lineWidth = 1; g.stroke(); }
        frPip(g, su, 125, 175, su === 's' ? 116 : 104);
      } else if (r <= 10) for (const [ci, ry] of FLAY[r]) { const y = FY[ry]; frPip(g, su, FC[ci], y, FPS[r], y > 176); }
      else frCourt(g, su, r);
      frIndex(g, su, r);
    }
    return cv;
  }
  // dorso: blu notte con la trama d'oro e i quattro semi al centro
  function frBack(pw, o) {
    o = o || {}; pw = Math.max(16, Math.round(pw)); const key = 'frback' + (o.c2 ? 'c2' : '') + '_' + pw; let c = cache.get(key); if (c) return c;
    const cv = pal2(o.c2, () => frBackDraw(pw));
    if (!o.tmp) cache.set(key, cv); return cv;
  }
  function frBackDraw(pw) {
    const [cv, g] = frCanvas(pw);
    rr(g, 1, 1, FW - 2, FH - 2, 17); g.fillStyle = '#fbfaf6'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#c9c4b6'; g.stroke();
    rr(g, 13, 13, FW - 26, FH - 26, 10);
    const q = g.createRadialGradient(125, 175, 20, 125, 175, 230); q.addColorStop(0, '#2b4a8f'); q.addColorStop(1, '#14244d'); g.fillStyle = q; g.fill();
    g.save(); g.clip();
    g.beginPath(); for (let d = -FH; d < FW + FH; d += 22) { g.moveTo(d, 0); g.lineTo(d + FH, FH); g.moveTo(d, FH); g.lineTo(d + FH, 0); }
    g.strokeStyle = 'rgba(226,180,80,.55)'; g.lineWidth = 1.3; g.stroke();
    g.fillStyle = '#e2b450'; for (let a = 0; a * 11 <= FW + 11; a++) for (let b = 0; b * 11 <= FH + 11; b++) if ((a + b) % 2 === 0) { circ(g, a * 11, b * 11, 1.6); g.fill(); }
    g.restore();
    rr(g, 13, 13, FW - 26, FH - 26, 10); g.lineWidth = 2.5; g.strokeStyle = '#e2b450'; g.stroke();
    rr(g, 21, 21, FW - 42, FH - 42, 7); g.lineWidth = 1.2; g.stroke();
    circ(g, 125, 175, 52); g.fillStyle = '#fbfaf6'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#d8a332'; g.stroke();
    circ(g, 125, 175, 45); g.lineWidth = 1.5; g.strokeStyle = '#14244d'; g.stroke();
    for (const [su, x, y] of [['s', 125, 152], ['h', 148, 175], ['c', 125, 198], ['d', 102, 175]]) frPip(g, su, x, y, 22, false, true);
    return cv;
  }
  const frUrls = new Map();
  function frUrl(su, r, pw, o) {   // r = 0 -> dorso
    o = o || {}; pw = Math.max(16, Math.round(pw)); const k = (r ? su + r + (o.j ? 'j' : '') : 'back') + (o.c2 ? 'c2' : '') + '_' + pw; let u = frUrls.get(k); if (u) return u;
    u = (r ? frCard(su, r, pw, { j: o.j, c2: o.c2, tmp: true }) : frBack(pw, { c2: o.c2, tmp: true })).toDataURL('image/png'); frUrls.set(k, u); return u;
  }
  const fr = { card: frCard, back: frBack, url: frUrl, pip: frPip, W: FW, H: FH, LAB: FRL, COL: FRC, joker: true };

  window.CARTE = { card, back, url, W, H, LAB, fr };
})();
