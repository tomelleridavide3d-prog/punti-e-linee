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
  window.CARTE = { card, back, url, W, H, LAB };
})();
