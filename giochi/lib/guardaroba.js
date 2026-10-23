// ==== GUARDAROBA: accessori TESTA / FACCIA per tutti i personaggi e PERSONAGGI ESCLUSIVI della gru (23-10-2026, CLAUDE.md "PESCA DEI PELUCHE") ====
// L.ht = cappello (uno dei 6 di serie dell'omino, gratis per tutti, o un premio della gru), L.fc = accessorio per la faccia (premio). Un cappello
// SOSTITUISCE quello di serie del personaggio (procione, regista, guardia, bruco, fiocco del lupo, cappello dell'omino): cqPlayer non lo disegna se c'e' L.ht.
// Ogni personaggio ha il suo punto della testa (HEAD: x verso dove guarda, y = tesa del cappello, s = misura) e della faccia (FACE: centro tra gli occhi).
// I cappelli si disegnano come quelli dell'omino (tesa a y = -39, testa larga 26), gli accessori della faccia attorno a (0, 0) con gli occhi a +-3,3.
// Personaggi esclusivi: CQ_SKINS_EX (in index.html non stanno in CQ_SKINS, cosi' i computer e la scelta normale non li usano); disegno qui (CQX.draw).
// Collezione: store.settings.coll = { id: quanti }, conteggio per il premio sicuro store.settings.gruPity. Ganci: cqPlayer, cqTop, cqLook, cqNetLook, scelta del personaggio.
window.CQX = (() => {
  const RAR = [{ n: 'Comune', c: '#c8ccd4' }, { n: 'Raro', c: '#4a9ae8' }, { n: 'Epico', c: '#b06ae8' }, { n: 'Leggendario', c: '#f2c230' }];
  const BASE = ['borsalino', 'basco', 'cilindro', 'cappellino', 'cuffie', 'corona'];
  // premi della gru: k = h testa / f faccia / c personaggio, r = rarita'
  const ITEMS = [
    ['paglia', 'h', 'Cappello di paglia', 0, '👒'], ['pompon', 'h', 'Berretto col pompon', 0, '🧶'], ['bandana', 'h', 'Bandana', 0, '🏴‍☠️'], ['chef', 'h', 'Cappello da chef', 0, '👨‍🍳'], ['elmetto', 'h', 'Elmetto da cantiere', 0, '⛑️'],
    ['sole', 'f', 'Occhiali da sole', 0, '🕶️'], ['clown', 'f', 'Naso da clown', 0, '🔴'], ['baffi', 'f', 'Baffi a manubrio', 0, '👨'],
    ['mago', 'h', 'Cappello da mago', 1, '🧙'], ['sombrero', 'h', 'Sombrero', 1, '🌵'], ['vichingo', 'h', 'Elmo vichingo', 1, '⚔️'], ['tricorno', 'h', 'Tricorno pirata', 1, '☠️'], ['fiori', 'h', 'Corona di fiori', 1, '🌸'],
    ['monocolo', 'f', 'Monocolo', 1, '🧐'], ['benda', 'f', 'Benda da pirata', 1, '🏴'], ['cuori', 'f', 'Occhiali a cuore', 1, '😍'],
    ['papera', 'c', 'Papera di gomma', 1, '🦆'], ['avocado', 'c', 'Avocado', 1, '🥑'], ['lumaca', 'c', 'Lumaca', 1, '🐌'], ['orsetto', 'c', 'Orsetto ricucito', 1, '🧸'],
    ['aureola', 'h', 'Aureola', 2, '😇'], ['squalo', 'h', 'Cappuccio da squalo', 2, '🦈'], ['strega', 'h', 'Cappello da strega', 2, '🕯️'],
    ['maschera', 'f', 'Maschera da supereroe', 2, '🦸'], ['visore', 'f', 'Visore futuristico', 2, '🥽'],
    ['robot', 'c', 'Robottino a molla', 2, '🤖'], ['fantasma', 'c', 'Fantasmino', 2, '👻'], ['cocco', 'c', 'Coccodrillo', 2, '🐊'], ['cobra', 'c', 'Cobra', 2, '🐍'], ['frate', 'c', 'Frate cappuccino', 2, '☕'],
    ['ghiaccio', 'h', 'Corona di ghiaccio', 3, '❄️'], ['nuvola', 'h', 'Nuvoletta che piove', 3, '🌧️'], ['torta', 'h', 'Torta con candelina', 3, '🎂'],
    ['drago', 'c', 'Draghetto', 3, '🐉'],
  ].map(([id, k, n, r, e]) => ({ id, k, n, r, e }));
  const BY = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  const SKINS = {
    orsetto: { n: 'Orsetto ricucito', col: '#b07a4a', d: 'Il peluche scappato dalla gru: toppe, punti di cucitura e un bottone al posto di un occhio. Sa cosa hai fatto.' },
    papera: { n: 'Papera di gomma', col: '#f6d23a', d: 'Una papera di gomma che squittisce a ogni passo. Non ti fidare.' },
    robot: { n: 'Robottino a molla', col: '#9ab0c8', d: 'Un robottino di latta con la chiave che gira sulla schiena. Ti scansiona.' },
    fantasma: { n: 'Fantasmino', col: '#f4f4f8', d: 'Un fantasmino col lenzuolo: sotto spuntano i calzini a righe.' },
    lumaca: { n: 'Lumaca', col: '#a8c070', d: 'Una lumaca con la casetta sulla schiena e la lucina accesa alla finestra. Lenta, ma ti osserva.' },
    drago: { n: 'Draghetto', col: '#3aa88a', d: 'Leggendario: un draghetto che sbuffa fumo quando si ferma.' },
    cocco: { n: 'Coccodrillo', col: '#4a8a3a', d: 'Un coccodrillo in piedi come un T-rex, con i mocassini col nappino. Sorride, ma non troppo.' },
    frate: { n: 'Frate cappuccino', col: '#7a4a2a', d: 'Un frate col saio: la testa e\' una tazza di cappuccino con la schiuma.' },
    cobra: { n: 'Cobra', col: '#c8a040', d: 'Un cobra arrotolato con la testa alta e la sua sciarpa rosa.' },
    avocado: { n: 'Avocado', col: '#5a8a2a', d: 'Un avocado con il nocciolo in pancia. Sospetta di tutti.' },
  };
  // punto della testa (tesa del cappello) e della faccia per ogni personaggio
  const HEAD = { omino: [0, -39, 1], procione: [0, -39, 1], gatto: [0, -39, 0.95], regista: [0.5, -40, 1], guardia: [0, -39.5, 1], tonno: [2, -43, 0.9], giraffa: [9, -69, 0.6],
    polipo: [0, -44, 1], bruco: [7, -39.5, 1], pane: [0, -45, 0.95], lupo: [14, -47.5, 0.6], pinguino: [2, -51, 0.72], bassotto: [15, -28, 0.6], palma: [3.5, -50, 0.75],
    orsetto: [2, -42, 0.9], papera: [4, -38.5, 0.75], robot: [1, -48, 0.95], fantasma: [1, -43, 1], lumaca: [15, -20, 0.55], drago: [6, -45, 0.8], cocco: [12, -48, 0.6], frate: [1, -47, 0.95], cobra: [4, -52, 0.75], avocado: [1, -43, 0.85] };
  const FACE = { omino: [4, -28.5, 0.95], procione: [4, -29.5, 1], gatto: [4, -29, 1], regista: [4.2, -32.5, 0.85], guardia: [4.7, -31, 0.85], tonno: [6, -33, 1.1], giraffa: [10.5, -65.2, 0.55],
    polipo: [4.5, -28, 1.1], bruco: [7.7, -31.5, 1], pane: [1.5, -29, 1], lupo: [17.6, -41, 0.6], pinguino: [5.8, -45, 0.75], bassotto: [14.5, -22, 0.6], palma: [2.6, -27, 0.7],
    orsetto: [3, -34, 0.9], papera: [5.5, -32, 0.8], robot: [1, -41, 0.9], fantasma: [3.5, -32, 1], lumaca: [15, -30.5, 0.75], drago: [7.5, -39, 0.75], cocco: [14.5, -45.5, 0.55], frate: [1.5, -38, 0.9], cobra: [5, -46, 0.75], avocado: [2.5, -30, 0.85] };
  const HAT_H = { cilindro: 27, mago: 36, strega: 32, chef: 18, torta: 22, nuvola: 24, aureola: 14, sombrero: 15, vichingo: 18, borsalino: 17, corona: 15 };
  const TOP0 = { orsetto: 1.55, papera: 1.35, robot: 1.85, fantasma: 1.5, lumaca: 1.2, drago: 1.75, cocco: 1.65, frate: 1.65, cobra: 1.8, avocado: 1.5 };
  const EYES = { orsetto: [[[0, -34], [6, -34]], 2.6, '#b07a4a'], papera: [[[3, -32], [8, -32]], 2.4, '#f6d23a'], robot: [[[-2.2, -41], [4.2, -41]], 2.2, '#9ab0c8'], fantasma: [[[0, -32], [7, -32]], 2.8, '#f4f4f8'],
    lumaca: [[[12.5, -30], [17.8, -31]], 2.3, '#a8c070'], drago: [[[5, -39], [10, -39.2]], 2.4, '#3aa88a'], cocco: [[[13, -46], [16.5, -46.2]], 1.9, '#4a8a3a'], frate: [[[-2, -38], [5, -38]], 2.6, '#f4f0e6'],
    cobra: [[[2.2, -46], [7.8, -46]], 2.2, '#c8a040'], avocado: [[[-1, -30], [6, -30]], 2.6, '#c8e080'] };
  const now = () => performance.now() / 1000;

  // ---- cappelli (in coordinate dell'omino: tesa a y -39) ----
  function hat(g, h, f) {
    const ell = (x, y, rx, ry, c, rot) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 7); g.fill(); };
    const poly = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
    const ln = (x0, y0, x1, y1, c, w) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const dome = (rx, ry, y, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(0, y, rx, ry, 0, Math.PI, 2 * Math.PI); g.fill(); };
    const t = now();
    switch (h) {
      case 'paglia':
        ell(0, -39, 21, 5.8, '#d8b24a'); ell(0, -39.6, 18, 4.4, '#e8c860');
        g.fillStyle = '#f0d070'; g.beginPath(); g.moveTo(-10, -39); g.quadraticCurveTo(-11, -52, 0, -52); g.quadraticCurveTo(11, -52, 10, -39); g.fill();
        g.fillStyle = '#d8343a'; g.fillRect(-10, -44.5, 20, 3.5);
        for (let x = -16; x <= 16; x += 4) ln(x, -41, x + 1.5, -37.5, 'rgba(150,110,40,.5)', 0.7);
        break;
      case 'pompon':
        dome(13.5, 12, -37, '#d8343a');
        for (let x = -10; x <= 10; x += 3.3) ln(x, -38, x * 0.7, -47, 'rgba(120,20,30,.45)', 1);
        g.fillStyle = '#f4f4f4'; g.fillRect(-13.5, -41, 27, 5); ell(0, -51, 4.8, 4.5, '#f8f8f8'); ell(-1.4, -52.4, 1.6, 1.4, '#fff');
        break;
      case 'bandana':
        g.fillStyle = '#d8343a'; g.beginPath(); g.moveTo(-13.5, -34); g.quadraticCurveTo(-14, -47, 0, -46.5); g.quadraticCurveTo(14, -47, 13.5, -34); g.quadraticCurveTo(0, -38, -13.5, -34); g.fill();
        for (const [x, y] of [[-7, -41], [0, -43], [7, -41], [-3, -38.5], [4, -38.5]]) ell(x, y, 1.1, 1.1, '#fff');
        poly([[-f * 12, -37], [-f * 20, -33], [-f * 17, -29]], '#b82a30'); poly([[-f * 12, -37], [-f * 21, -38], [-f * 19, -43]], '#b82a30'); ell(-f * 12.5, -37, 2.4, 2.4, '#b82a30');
        break;
      case 'chef':
        g.fillStyle = '#f4f4f4'; g.fillRect(-10, -46.5, 20, 8); g.strokeStyle = '#c8ccd4'; g.lineWidth = 0.8; g.strokeRect(-10, -46.5, 20, 8);
        for (const [x, y, r] of [[-6.5, -51, 6.5], [6.5, -51, 6.5], [0, -55, 7.5]]) { ell(x, y, r, r * 0.9, '#fafafa'); g.strokeStyle = '#d8dce4'; g.beginPath(); g.ellipse(x, y, r, r * 0.9, 0, Math.PI * 0.9, Math.PI * 2.1); g.stroke(); }
        break;
      case 'elmetto':
        dome(14, 12, -38, '#f2c230'); ell(f * 3, -38.5, 18, 3.6, '#d9a514');
        g.fillStyle = '#e0b020'; g.fillRect(-2, -50, 4, 12);
        ell(f * 10, -43, 2.6, 2.6, '#fff8c8');
        break;
      case 'mago':
        ell(0, -39, 18.5, 4.8, '#2a2a88');
        g.fillStyle = '#3a3ab8'; g.beginPath(); g.moveTo(-10.5, -40); g.quadraticCurveTo(-4, -60, f * 2, -73); g.quadraticCurveTo(f * 9, -76, f * 13, -72); g.quadraticCurveTo(f * 6, -70, f * 4, -66); g.lineTo(10.5, -40); g.closePath(); g.fill();
        g.fillStyle = '#f2c230'; g.fillRect(-10, -44.5, 20, 3);
        for (const [x, y, r] of [[-4, -52, 2.2], [4, -58, 1.8], [-1, -64, 1.5], [6, -48, 1.3]]) { g.fillStyle = '#ffe680'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
        break;
      case 'sombrero':
        ell(0, -39, 27, 7, '#c8902a'); ell(0, -40, 24, 5.6, '#e0aa48');
        for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; ell(Math.cos(a) * 25, -39 + Math.sin(a) * 6.3, 1.4, 0.9, i % 2 ? '#d8343a' : '#2e8a44'); }
        g.fillStyle = '#e8b850'; g.beginPath(); g.moveTo(-8.5, -40); g.quadraticCurveTo(-9, -55, 0, -55); g.quadraticCurveTo(9, -55, 8.5, -40); g.fill();
        g.fillStyle = '#d8343a'; g.fillRect(-8.5, -45, 17, 2.5); g.fillStyle = '#2e8a44'; g.fillRect(-8.5, -42.5, 17, 1.5);
        break;
      case 'vichingo':
        for (const k of [-1, 1]) { g.fillStyle = '#efe4c4'; g.beginPath(); g.moveTo(k * 11, -43); g.quadraticCurveTo(k * 22, -46, k * 21, -59); g.quadraticCurveTo(k * 17, -50, k * 10, -48); g.fill(); }
        dome(13.5, 12.5, -37.5, '#9aa4b0'); g.fillStyle = '#7a8490'; g.fillRect(-13.5, -41, 27, 4.5); g.fillRect(-1.5, -50, 3, 10);
        for (const x of [-10, -5, 5, 10]) ell(x, -38.8, 0.9, 0.9, '#d8dce4');
        break;
      case 'tricorno':
        g.fillStyle = '#1e1e24'; g.beginPath(); g.moveTo(-20, -40); g.quadraticCurveTo(-12, -55, 0, -50); g.quadraticCurveTo(12, -55, 20, -40); g.quadraticCurveTo(0, -35, -20, -40); g.fill();
        g.strokeStyle = '#d9a514'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-20, -40); g.quadraticCurveTo(-12, -55, 0, -50); g.quadraticCurveTo(12, -55, 20, -40); g.stroke();
        ell(0, -45, 3, 2.7, '#f4f0e6'); ell(-1, -45.4, 0.7, 0.7, '#111'); ell(1, -45.4, 0.7, 0.7, '#111'); ln(-2.5, -41.5, 2.5, -43, '#f4f0e6', 0.8); ln(2.5, -41.5, -2.5, -43, '#f4f0e6', 0.8);
        break;
      case 'fiori':
        for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i * 0.9 / 8), x = Math.cos(a) * 13, y = -38 + Math.sin(a) * 6; ell(x * 1.05, y + 1.5, 3, 1.3, '#3e8a46', a); }
        for (let i = 0; i < 7; i++) { const a = Math.PI * (1.1 + i * 0.8 / 6), x = Math.cos(a) * 12.5, y = -38.5 + Math.sin(a) * 6.5, c = ['#ff7ac8', '#fff3a0', '#ff9a8a', '#c8a8ff'][i % 4]; for (let p = 0; p < 5; p++) { const b = p * Math.PI * 0.4; ell(x + Math.cos(b) * 2, y + Math.sin(b) * 1.8, 1.6, 1.4, c); } ell(x, y, 1.1, 1.1, '#f2c230'); }
        break;
      case 'aureola': {
        const y = -50 + Math.sin(t * 2.5) * 1.5;
        g.strokeStyle = 'rgba(255,230,120,.35)'; g.lineWidth = 5; g.beginPath(); g.ellipse(0, y, 11, 3.2, 0, 0, 7); g.stroke();
        g.strokeStyle = '#ffe14a'; g.lineWidth = 2.2; g.beginPath(); g.ellipse(0, y, 11, 3.2, 0, 0, 7); g.stroke();
        break;
      }
      case 'squalo':
        g.fillStyle = '#7a8a9a'; g.beginPath(); g.moveTo(-14.5, -30); g.quadraticCurveTo(-15, -50, 0, -49); g.quadraticCurveTo(15, -50, 14.5, -30); g.lineTo(11, -33); g.quadraticCurveTo(0, -40, -11, -33); g.closePath(); g.fill();
        g.fillStyle = '#e8ecf0'; g.beginPath(); g.moveTo(-11, -33); g.quadraticCurveTo(0, -40, 11, -33); g.quadraticCurveTo(0, -37, -11, -33); g.fill();
        g.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { const x = -9 + i * 3; poly([[x - 1.4, -35 - Math.abs(x) * 0.12 - 1.5], [x + 1.4, -35 - Math.abs(x) * 0.12 - 1.5], [x, -32.5 - Math.abs(x) * 0.1]], '#fff'); }
        poly([[-f * 2, -48], [-f * 8, -60], [-f * 10, -47]], '#6a7a8a'); ell(f * 7, -44, 1.6, 1.6, '#111'); ell(f * 7.4, -44.4, 0.5, 0.5, '#fff');
        break;
      case 'strega': {
        ell(0, -39, 19, 5, '#1e1a24');
        g.fillStyle = '#2a2430'; g.beginPath(); g.moveTo(-10, -40); g.quadraticCurveTo(-6, -58, -f * 4, -70); g.quadraticCurveTo(f * 2, -64, f * 4, -60); g.quadraticCurveTo(8, -50, 10, -40); g.closePath(); g.fill();
        g.fillStyle = '#7a3ab8'; g.fillRect(-10, -45, 20, 3.5); g.strokeStyle = '#d9a514'; g.lineWidth = 1; g.strokeRect(-2.5, -45.5, 5, 4.5);
        g.fillStyle = '#f4ead2'; g.fillRect(f * 12 - 1.6, -50, 3.2, 8);   // candela sulla tesa
        const fl = 1 + Math.sin(t * 13) * 0.15; g.fillStyle = 'rgba(255,200,80,.35)'; g.beginPath(); g.arc(f * 12, -52.5, 4.5, 0, 7); g.fill();
        g.fillStyle = '#ffb02a'; g.beginPath(); g.ellipse(f * 12, -52.5, 1.6, 2.8 * fl, 0, 0, 7); g.fill(); g.fillStyle = '#fff3a0'; g.beginPath(); g.ellipse(f * 12, -52, 0.8, 1.4 * fl, 0, 0, 7); g.fill();
        break;
      }
      case 'ghiaccio': {
        const sp = [[-11, 6], [-6.5, 10], [-2, 7], [2.5, 12], [7, 8], [11, 6]];
        g.fillStyle = 'rgba(160,230,255,.85)'; g.fillRect(-12, -42.5, 24, 4);
        for (const [x, h2] of sp) { poly([[x - 2.6, -42], [x, -42 - h2], [x + 2.6, -42]], 'rgba(180,240,255,.9)'); poly([[x - 0.6, -42], [x, -42 - h2], [x + 2.6, -42]], 'rgba(120,200,240,.9)'); }
        for (let i = 0; i < 3; i++) { const p = (t * 0.8 + i / 3) % 1, x = -10 + i * 9, y = -48 - i * 2, s = Math.sin(p * Math.PI) * 2.6; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.3, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.3, y); g.fill(); g.beginPath(); g.moveTo(x - s, y); g.lineTo(x, y + s * 0.3); g.lineTo(x + s, y); g.lineTo(x, y - s * 0.3); g.fill(); }
        break;
      }
      case 'nuvola': {
        const by = -60 + Math.sin(t * 1.8) * 1.2;
        for (let i = 0; i < 5; i++) { const p = (t * 1.4 + i / 5) % 1, x = -7 + i * 3.5; g.strokeStyle = 'rgba(110,170,240,' + (1 - p) + ')'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, by + 4 + p * 18); g.lineTo(x - 0.6, by + 7 + p * 18); g.stroke(); }
        for (const [x, y, r] of [[-7, 1, 5.5], [0, -2, 7], [7, 1, 5.5], [-3, 3, 5], [4, 3, 5]]) ell(x, by + y, r, r * 0.8, '#c8ccd8');
        for (const [x, y, r] of [[-6, 0, 4.5], [0, -3, 5.8], [6, 0, 4.5]]) ell(x, by + y - 0.8, r, r * 0.75, '#e4e8f0');
        break;
      }
      case 'torta': {
        g.fillStyle = '#f2b0c8'; g.fillRect(-11, -50, 22, 11); g.fillStyle = '#fff3f8'; g.fillRect(-9, -57, 18, 7.5);
        ell(0, -39, 11.5, 3, '#e090b0'); ell(0, -50, 11, 2.8, '#fff3f8'); ell(0, -57, 9, 2.4, '#ffd8e8');
        for (const x of [-8, -3, 3, 8]) ell(x, -48.5, 1.6, 2.6, '#fff3f8');
        for (const [x, c] of [[-6, '#d8343a'], [0, '#3a7ae8'], [6, '#f2c230']]) ell(x, -54, 1, 1, c);
        g.fillStyle = '#7ac8f0'; g.fillRect(-1, -64, 2, 7); const fl = 1 + Math.sin(t * 12) * 0.18;
        g.fillStyle = 'rgba(255,200,80,.35)'; g.beginPath(); g.arc(0, -66.5, 4, 0, 7); g.fill(); g.fillStyle = '#ffb02a'; g.beginPath(); g.ellipse(0, -66.5, 1.5, 2.6 * fl, 0, 0, 7); g.fill();
        break;
      }
      default: cqHat(g, h, f);
    }
  }
  // ---- faccia (centro tra gli occhi in 0, 0) ----
  function face(g, a, f) {
    const ell = (x, y, rx, ry, c, rot) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 7); g.fill(); };
    const ln = (x0, y0, x1, y1, c, w) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const heart = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.4, x, y - r * 0.45); g.bezierCurveTo(x + r * 0.7, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.fill(); };
    switch (a) {
      case 'sole':
        for (const x of [-3.4, 3.4]) { g.fillStyle = '#15171b'; cqRR(g, x - 3, -2.2, 6, 4.4, 1.8); g.fill(); ell(x - 1.2, -1, 1, 0.6, 'rgba(255,255,255,.5)', -0.4); }
        ln(-0.5, -0.8, 0.5, -0.8, '#15171b', 1); ln(-f * 6.2, -1, -f * 9.5, -1.6, '#15171b', 0.8); break;
      case 'clown': ell(f * 4.5, 4, 3.2, 3, '#e8343a'); ell(f * 3.6, 3, 1, 0.8, '#ffb0a8'); break;
      case 'baffi':
        g.fillStyle = '#2a1a10'; for (const k of [-1, 1]) { g.beginPath(); g.moveTo(f * 2, 5); g.quadraticCurveTo(f * 2 + k * 4, 3, f * 2 + k * 6.5, 6); g.quadraticCurveTo(f * 2 + k * 8.5, 7.5, f * 2 + k * 7.5, 3.5); g.quadraticCurveTo(f * 2 + k * 9.5, 7.5, f * 2 + k * 6, 7.8); g.quadraticCurveTo(f * 2 + k * 3, 7.5, f * 2, 6.2); g.fill(); }
        break;
      case 'monocolo':
        g.strokeStyle = '#d9a514'; g.lineWidth = 1.2; g.beginPath(); g.arc(f * 3.4, 0, 3.2, 0, 7); g.stroke(); ell(f * 3.4, 0, 2.6, 2.6, 'rgba(200,230,255,.35)');
        g.strokeStyle = '#d9a514'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(f * 3.4, 3.2); g.quadraticCurveTo(f * 1, 10, f * -2, 14); g.stroke(); break;
      case 'benda':
        ln(f * 3.4, -2, -f * 12, -6, '#1a1a1a', 1); ln(f * 3.4, 1.5, -f * 12, 2, '#1a1a1a', 1);
        ell(f * 3.4, 0, 3.2, 3, '#15171b'); break;
      case 'cuori':
        for (const x of [-3.4, 3.4]) { heart(x, 0, 3.2, '#e83a7a'); heart(x, 0, 2.3, '#ff7ab0'); }
        ln(-0.8, -0.8, 0.8, -0.8, '#e83a7a', 1); break;
      case 'maschera':
        g.fillStyle = '#c8303a'; g.beginPath(); g.moveTo(-8.5, -1); g.quadraticCurveTo(-7, -4.5, 0, -2.5); g.quadraticCurveTo(7, -4.5, 8.5, -1); g.quadraticCurveTo(7, 4, 0, 2); g.quadraticCurveTo(-7, 4, -8.5, -1); g.fill();
        ln(-8.5, -1, -f * 11 + (f > 0 ? -1 : 1), -2 + Math.sin(now() * 6) * 1.2, '#c8303a', 1.4);
        for (const x of [-3.6, 3.6]) ell(x, -0.3, 1.9, 1.3, '#fff'); break;
      case 'visore': {
        g.fillStyle = '#2a2e35'; cqRR(g, -8.5, -2.6, 17, 5.2, 2.4); g.fill();
        const gr = g.createLinearGradient(-8, 0, 8, 0); gr.addColorStop(0, '#2ad8f0'); gr.addColorStop(1, '#7a5af0'); g.fillStyle = gr; cqRR(g, -7.5, -1.8, 15, 3.6, 1.8); g.fill();
        const sx = -7 + ((now() * 0.9) % 1) * 14; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(sx, -1.8, 1.2, 3.6);
        break;
      }
    }
  }
  // accessori sul personaggio (chiamato da cqPlayer, dentro la sua trasformazione)
  function acc(g, L, f) {
    const s = L.skin;
    if (L.ht && L.ht !== 'nessuno') { const a = HEAD[s] || HEAD.omino; g.save(); g.translate(f * a[0], a[1]); g.scale(a[2], a[2]); g.translate(0, 39); hat(g, L.ht, f); g.restore(); }
    if (L.fc) { const a = FACE[s] || FACE.omino; g.save(); g.translate(f * a[0], a[1]); g.scale(a[2], a[2]); face(g, L.fc, f); g.restore(); }
  }
  const top = L => {
    const s = L.skin, a = HEAD[s] || HEAD.omino;
    if (L.ht && L.ht !== 'nessuno') return (-a[1] + (HAT_H[L.ht] || 12) * a[2] + 5) / 34;
    return TOP0[s] || 0;
  };

  // ---- personaggi esclusivi (stesso stile dei personaggi di cqPlayer; P = attrezzi di cqPlayer) ----
  const draw = {
    orsetto(P) {
      const { g, f, sw, ell, tri, line, susEye } = P, fur = '#b07a4a', dk = '#8a5a34', lt = '#e0b888';
      ell(-6 + sw, -2, 5, 3.5, dk); ell(6 - sw, -2, 5, 3.5, dk);
      ell(-f * 12, -19, 3.6, 5.5, fur, f * 0.5); ell(0, -16, 11.5, 13, fur); ell(f * 2, -14, 7, 8.5, lt);
      g.fillStyle = '#7ab0d8'; g.fillRect(-f * 9 - 3, -22, 6, 6); g.strokeStyle = '#3a2a1a'; g.lineWidth = 0.6; g.setLineDash([1.2, 1]); g.strokeRect(-f * 9 - 3, -22, 6, 6); g.setLineDash([]);   // toppa
      ell(f * 12, -18, 3.4, 5.2, fur, -f * 0.5);
      for (const k of [-1, 1]) { ell(k * 8 + f * 2, -42, 4.4, 4.4, fur); ell(k * 8 + f * 2, -42, 2.4, 2.4, '#e8a0a0'); }
      ell(f * 2, -33, 11.5, 10, fur); ell(f * 5, -29, 5.5, 4, lt); ell(f * 8, -30.5, 1.8, 1.4, '#2a1a10');
      line(f * 6, -27.4, f * 9.5, -27, '#5a3a20', 0.9);
      susEye(f * 0, -34, 2.6, fur);
      ell(f * 6, -34, 2.8, 2.8, '#3a3ab0'); for (const [dx, dy] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) ell(f * 6 + dx, -34 + dy, 0.45, 0.45, '#111');   // occhio a bottone
      line(-f * 4, -38, -f * 1, -36.5, '#3a2a1a', 1.2);
      g.strokeStyle = '#3a2a1a'; g.lineWidth = 0.7; for (let i = 0; i < 4; i++) { const x = -f * 6 + f * i * 1.6; g.beginPath(); g.moveTo(x - 0.8, -27); g.lineTo(x + 0.8, -25.5); g.stroke(); }   // cucitura
    },
    papera(P) {
      const { g, f, sw, ell, tri, line, susEye } = P, y = '#f6d23a', yd = '#d8b020';
      ell(-5 + sw, -1.5, 4.5, 2.2, '#f08a24'); ell(5 - sw, -1.5, 4.5, 2.2, '#f08a24');
      ell(-f * 10, -16, 6, 4, yd, -f * 0.5); ell(0, -13, 14, 10.5, y); ell(-f * 2, -14, 8, 5.5, yd, -f * 0.2);
      ell(f * 4, -29, 9, 8.5, y); ell(f * 1.5, -33, 3, 2, 'rgba(255,255,255,.45)', -0.4);
      tri([[f * 11, -30], [f * 18, -28.5], [f * 11, -25.5]], '#f08a24'); line(f * 11.5, -27.6, f * 17, -28.3, '#c8650c', 0.9);
      susEye(f * 3, -32, 2.4, y); susEye(f * 8, -32, 2.4, y);
      line(f * 0.5, -35.5, f * 4.5, -34.6, '#8a6a10', 1.1); line(f * 6.5, -35.2, f * 10, -36.4, '#8a6a10', 1.1);
    },
    robot(P) {
      const { g, f, sw, ell, line } = P, m = '#9ab0c8', md = '#6a80a0', t = now();
      g.fillStyle = md; g.fillRect(-6 + sw * 0.5 - 1.5, -9, 3, 7); g.fillRect(6 - sw * 0.5 - 1.5, -9, 3, 7);
      for (const x of [-6 + sw * 0.5, 6 - sw * 0.5]) { g.strokeStyle = '#c8ccd4'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 4; i++) g.lineTo(x + (i % 2 ? 1.6 : -1.6), -9 + i * 2); g.stroke(); ell(x, -1.2, 4.2, 2.2, '#4a5060'); }
      const ka = t * 4, kw = Math.cos(ka) * 4;   // chiave che gira sulla schiena
      g.fillStyle = '#d9a514'; g.fillRect(-f * 12 - 3, -23, 3, 2.4); ell(-f * 15, -22, Math.abs(kw) + 0.6, 4, '#f2c230'); ell(-f * 15, -22, Math.max(0.3, Math.abs(kw) * 0.4), 1.6, '#c8960c');
      g.fillStyle = m; cqRR(g, -11, -31, 22, 23, 4); g.fill(); g.fillStyle = md; cqRR(g, -7, -26, 14, 9, 2); g.fill();
      for (let i = 0; i < 3; i++) ell(-4 + i * 4, -21.5, 1.3, 1.3, ['#e84a4a', '#4ac868', '#f2c230'][(i + Math.floor(t * 2)) % 3]);
      for (const [x, y] of [[-9, -29], [9, -29], [-9, -10], [9, -10]]) ell(x, y, 0.8, 0.8, '#d8dce4');
      line(f * 11, -26, f * 15, -18 + Math.sin(t * 3) * 1.5, md, 2.6); line(-f * 11, -26, -f * 14, -18, md, 2.6);
      g.fillStyle = m; cqRR(g, f * 1 - 10, -48, 20, 15, 3.5); g.fill(); g.fillStyle = md; g.fillRect(f * 1 - 2, -34, 4, 3);
      line(f * 1, -48, f * 1, -54, md, 1.2); ell(f * 1, -55, 1.8, 1.8, Math.floor(t * 2) % 2 ? '#ff4a4a' : '#7a2a2a');
      for (const x of [-2.2, 4.2]) { g.fillStyle = '#1a2a3a'; cqRR(g, f * x - 2.4, -43.2, 4.8, 4.4, 1); g.fill(); g.fillStyle = '#5af0ff'; g.fillRect(f * x - 1.6 + f * 0.8, -41.8, 2, 2.4); g.fillStyle = m; g.fillRect(f * x - 2.6, -43.6, 5.2, 2); }
      g.fillStyle = '#4a5060'; for (let i = 0; i < 5; i++) g.fillRect(f * 1 - 4 + i * 1.8, -37.5, 1, 1.6);
    },
    fantasma(P) {
      const { g, f, sw, ell, line } = P, t = now(), bob = Math.sin(t * 3) * 1.2;
      for (const [x, k] of [[-5, 1], [5, -1]]) { const ox = x + k * sw * 0.6; g.fillStyle = '#f4f4f4'; g.fillRect(ox - 2, -7, 4, 5); g.fillStyle = '#e8343a'; g.fillRect(ox - 2, -6, 4, 1.2); g.fillRect(ox - 2, -3.8, 4, 1.2); ell(ox + f * 1, -1.5, 3.4, 1.8, '#e8343a'); }
      g.save(); g.translate(0, bob);
      g.fillStyle = '#f4f4f8'; g.beginPath(); g.moveTo(-13, -6); g.lineTo(-13, -30); g.quadraticCurveTo(-13, -45, 1, -45); g.quadraticCurveTo(14, -45, 14, -30); g.lineTo(14, -6);
      for (let i = 0; i <= 6; i++) { const x = 14 - i * 4.5, y = -6 + (i % 2 ? -3 : 1) + Math.sin(t * 4 + i) * 0.8; g.lineTo(x, y); } g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.07)'; g.beginPath(); g.moveTo(14, -6); g.lineTo(14, -30); g.quadraticCurveTo(14, -45, 1, -45); g.quadraticCurveTo(10, -39, 10, -28); g.lineTo(10, -6); g.fill();
      for (const x of [0, 7]) { ell(f * x, -32, 2.8, 3.4, '#1a1a22'); ell(f * x + f * 1, -31, 1, 1.2, '#fff'); ell(f * x, -34.4, 3.2, 1.9, '#f4f4f8'); }
      line(-f * 2.6, -36.8, f * 2, -35.6, '#8a8a98', 1); line(f * 5, -35.8, f * 9.4, -37, '#8a8a98', 1);
      g.strokeStyle = '#8a8a98'; g.lineWidth = 1; g.beginPath(); g.moveTo(f * 1.5, -25.5); g.quadraticCurveTo(f * 4, -26.3, f * 6.5, -27); g.stroke();
      g.restore();
    },
    lumaca(P) {
      const { g, f, sw, ell, tri, line, susEye } = P, b = '#a8c070', bd = '#88a050', t = now();
      ell(0, -4, 17, 4.5, b); ell(f * 3, -2.5, 15, 2.2, bd);
      ell(f * 14, -12, 4.5, 8, b, f * 0.25);
      line(f * 12.5, -18, f * 12, -28 + Math.sin(t * 3) * 0.6, bd, 1.4); line(f * 16.5, -18.5, f * 17.6, -29 + Math.cos(t * 3) * 0.6, bd, 1.4);
      susEye(f * 12.5, -30, 2.3, b); susEye(f * 17.8, -31, 2.3, b);
      g.strokeStyle = '#4a5a20'; g.lineWidth = 1; g.beginPath(); g.moveTo(f * 13.5, -12); g.quadraticCurveTo(f * 15.5, -12.6, f * 17.2, -13.6); g.stroke();
      // casetta sulla schiena: muri, tetto rosso, finestra accesa, comignolo col fumo
      const hx = -f * 4;
      g.fillStyle = '#e8dcbc'; g.fillRect(hx - 9, -24, 18, 16); g.fillStyle = '#c8b890'; g.fillRect(hx + (f > 0 ? -9 : 5), -24, 4, 16);
      tri([[hx - 11, -23], [hx, -35], [hx + 11, -23]], '#c8303a'); tri([[hx - 11, -23], [hx - 9, -25.5], [hx + 9, -25.5], [hx + 11, -23]], '#a82028');
      g.fillStyle = '#8a3a2a'; g.fillRect(hx + f * 5 - 1.5, -35, 3, 6);
      for (let k = 0; k < 2; k++) { const p = (t * 0.5 + k / 2) % 1; ell(hx + f * 5 + p * 3, -36 - p * 8, 1.4 + p * 1.8, 1.2 + p * 1.4, 'rgba(225,228,235,' + (0.7 * (1 - p)).toFixed(2) + ')'); }
      const lit = 0.85 + Math.sin(t * 5) * 0.1; g.fillStyle = 'rgba(255,220,120,.35)'; g.beginPath(); g.arc(hx + f * 2, -17, 6, 0, 7); g.fill();
      g.fillStyle = `rgba(255,${Math.round(205 * lit)},90,1)`; g.fillRect(hx + f * 2 - 2.6, -20, 5.2, 5.2); g.fillStyle = '#6a4a2a'; g.fillRect(hx + f * 2 - 0.4, -20, 0.8, 5.2); g.fillRect(hx + f * 2 - 2.6, -17.8, 5.2, 0.8);
      g.fillStyle = '#6a4a2a'; g.fillRect(hx - f * 5 - 2, -14, 4, 6);
    },
    drago(P) {
      const { g, f, sw, ell, tri, line, susEye, walk } = P, c = '#3aa88a', cd = '#2a8068', bl = '#f2e0a0', t = now();
      g.strokeStyle = c; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-f * 8, -8); g.quadraticCurveTo(-f * 20, -4 + sw * 0.4, -f * 24, -14); g.stroke();
      tri([[-f * 22, -14], [-f * 28, -20], [-f * 25, -11]], '#f2c230');
      ell(-6 + sw, -1.5, 4.5, 2.4, cd); ell(6 - sw, -1.5, 4.5, 2.4, cd);
      const fl = Math.sin(t * (walk ? 10 : 3)) * 0.35;   // alette
      g.save(); g.translate(-f * 7, -27); g.rotate(-f * (0.5 + fl)); g.fillStyle = '#5ac8a8'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-f * 12, -8); g.lineTo(-f * 9, -1); g.lineTo(-f * 12, 3); g.lineTo(-f * 4, 4); g.closePath(); g.fill(); g.restore();
      ell(0, -17, 11, 13, c); ell(f * 3, -15, 6.5, 9.5, bl);
      for (const y of [-21, -16, -11]) line(f * -0.5, y, f * 6.5, y, '#d8c070', 0.7);
      ell(f * 6, -37, 9.5, 8, c); ell(f * 13, -34, 5.5, 4, c);
      ell(f * 16, -35, 0.8, 0.7, '#1a3a30'); ell(f * 16.5, -33.2, 0.8, 0.7, '#1a3a30');
      for (const k of [0, 1]) tri([[f * (2 + k * 5), -43], [f * (0 + k * 5), -52], [f * (5 + k * 5), -44]], '#f2e0a0');
      susEye(f * 5, -39, 2.4, c); susEye(f * 10, -39.2, 2.4, c);
      line(f * 2.4, -42.8, f * 6.6, -41.8, '#1a4a3a', 1.2); line(f * 8.4, -42, f * 12.4, -43.4, '#1a4a3a', 1.2);
      g.strokeStyle = '#1a4a3a'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(f * 9, -31.5); g.quadraticCurveTo(f * 12, -32, f * 15, -32.8); g.stroke();
      line(f * 9, -24, f * 14, -21, c, 2.6); line(-f * 6, -24, -f * 10, -19, c, 2.6);
      if (!walk) for (let k = 0; k < 3; k++) { const p = (t * 0.7 + k / 3) % 1; ell(f * (18 + p * 6), -35 - p * 10, 1.4 + p * 2.6, 1.2 + p * 2.2, 'rgba(230,232,238,' + (0.75 * (1 - p)).toFixed(2) + ')'); }   // fumo da fermo
    },
    cocco(P) {
      const { g, f, sw, ell, tri, line, susEye } = P, c = '#4a8a3a', cd = '#3a6a2a', lt = '#c8d890';
      ell(-f * 18, -14, 12, 4.5, c, f * 0.25); for (let i = 0; i < 4; i++) tri([[-f * (12 + i * 5), -18 - (i < 2 ? 0 : 1)], [-f * (14 + i * 5), -22], [-f * (16 + i * 5), -17.5]], cd);
      const leg = (dx, k, col) => { ell(dx, -12, 5, 7, col, -f * 0.2); line(dx + f * 1, -7, dx + f * 0.5 + k * sw * 0.8, -3, col, 3.8); const fx = dx + f * 2 + k * sw * 0.8; g.fillStyle = '#7a4a24'; cqRR(g, fx - 4.5, -4, 9, 3.6, 1.6); g.fill(); ell(fx + f * 1.5, -1.6, 4.6, 1.8, '#6a3a1a'); ell(fx + f * 2.5, -3.6, 1, 1, '#d9a514'); line(fx + f * 2.5, -3.6, fx + f * 3.4, -1.8, '#d9a514', 0.7); };
      leg(-f * 3, -1, cd);
      ell(f * 3, -23, 11, 10, c, -f * 0.3); ell(f * 6, -20, 6.5, 6.5, lt, -f * 0.3);
      for (const y of [-25, -21, -17]) line(f * 2.5, y, f * 9, y + 0.5, '#a8b870', 0.7);
      leg(f * 2, 1, c);
      ell(f * 11, -34, 5.5, 7, c, -f * 0.4);
      g.fillStyle = c; g.beginPath(); g.moveTo(f * 9, -48); g.quadraticCurveTo(f * 16, -50, f * 19, -45); g.lineTo(f * 32, -42); g.quadraticCurveTo(f * 34, -40, f * 32, -38.5); g.lineTo(f * 12, -37); g.closePath(); g.fill();
      g.fillStyle = cd; g.beginPath(); g.moveTo(f * 12, -37); g.lineTo(f * 31, -38.5); g.quadraticCurveTo(f * 30, -35, f * 26, -35); g.lineTo(f * 12, -34); g.closePath(); g.fill();
      for (let i = 0; i < 6; i++) tri([[f * (15 + i * 2.8), -38.6], [f * (16.4 + i * 2.8), -36.6], [f * (17.8 + i * 2.8), -38.7]], '#f4f4f4');
      ell(f * 31.5, -42.5, 0.9, 0.7, '#1a2a10');
      ell(f * 13, -46.5, 3, 2.4, c); ell(f * 16.5, -46.7, 3, 2.4, c);
      for (const x of [13, 16.5]) { ell(f * x, -46, 1.9, 2.1, '#e8d84a'); ell(f * (x + 0.7), -45.8, 0.7, 1.6, '#111'); ell(f * x, -47.3, 2.3, 1.4, c); }
      line(f * 11, -49.3, f * 14.6, -48.4, '#1a3a10', 1.1); line(f * 15.4, -48.8, f * 19, -50.2, '#1a3a10', 1.1);
      line(f * 10, -26, f * 15, -26, c, 2.2); line(f * 15, -26, f * 16.4, -23.6, c, 1.8);
    },
    frate(P) {
      const { g, f, sw, ell, tri, line, susEye } = P, saio = '#7a4a2a', sd = '#5a3418';
      ell(-5 + sw, -1, 4.5, 2.2, '#c89a6a'); ell(5 - sw, -1, 4.5, 2.2, '#c89a6a'); line(-5 + sw, -1.5, -3 + sw, -3, '#6a4a2a', 0.8); line(5 - sw, -1.5, 7 - sw, -3, '#6a4a2a', 0.8);
      g.fillStyle = saio; g.beginPath(); g.moveTo(-13, -2); g.lineTo(-11, -28); g.quadraticCurveTo(0, -33, 11, -28); g.lineTo(13, -2); g.quadraticCurveTo(0, 1, -13, -2); g.fill();
      g.fillStyle = sd; g.beginPath(); g.moveTo(13, -2); g.lineTo(11, -28); g.quadraticCurveTo(8, -26, 8, -20); g.lineTo(9, -2); g.fill();
      g.fillStyle = sd; g.beginPath(); g.ellipse(-f * 3, -33, 12, 9, 0, Math.PI, 2 * Math.PI); g.fill();   // cappuccio dietro la tazza
      line(-11, -15, 11, -15, '#f4ead2', 1.6); line(f * 3, -15, f * 4, -6, '#f4ead2', 1.2); ell(f * 4, -5.5, 1.2, 1.2, '#f4ead2');   // cordone
      line(f * 10, -24, f * 14, -16, saio, 3.6); ell(f * 14.5, -15, 2.2, 2.2, '#f0c8a0');
      ell(f * 1, -29.5, 13, 3, '#f4f0e6'); ell(f * 1, -30, 11, 2, '#e4dccc');   // piattino
      g.fillStyle = '#f8f4ec'; g.beginPath(); g.moveTo(f * 1 - 10, -46); g.lineTo(f * 1 + 10, -46); g.quadraticCurveTo(f * 1 + 10, -31, f * 1, -31); g.quadraticCurveTo(f * 1 - 10, -31, f * 1 - 10, -46); g.fill();
      g.strokeStyle = '#f8f4ec'; g.lineWidth = 2; g.beginPath(); g.arc(f * 12, -39.5, 3.2, f > 0 ? -1.4 : Math.PI - 1.8, f > 0 ? 1.8 : Math.PI + 1.4); g.stroke();
      g.strokeStyle = '#2c4e86'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(f * 1 - 9.6, -43.5); g.lineTo(f * 1 + 9.6, -43.5); g.stroke();
      ell(f * 1, -46, 10, 2.6, '#c89a68'); ell(f * 1, -46.6, 9.5, 2.3, '#f0dcc0'); ell(f * 1 - 2, -47.4, 3, 1, '#fffaf0');
      g.fillStyle = '#8a5a34'; g.beginPath(); const hx2 = f * 2, hy2 = -46.6; g.moveTo(hx2, hy2 + 1); g.bezierCurveTo(hx2 - 2.4, hy2 - 0.4, hx2 - 1.2, hy2 - 1.8, hx2, hy2 - 0.6); g.bezierCurveTo(hx2 + 1.2, hy2 - 1.8, hx2 + 2.4, hy2 - 0.4, hx2, hy2 + 1); g.fill();   // cuore di cacao
      susEye(f * -2, -38, 2.6, '#f8f4ec'); susEye(f * 5, -38, 2.6, '#f8f4ec');
      line(f * -5, -42, f * 0.4, -40.8, '#6a4a2a', 1.2); line(f * 2.6, -41, f * 8, -42.6, '#6a4a2a', 1.2);
      g.strokeStyle = '#6a4a2a'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(f * -0.5, -33.6); g.quadraticCurveTo(f * 2.5, -34.4, f * 5.5, -35.2); g.stroke();
    },
    cobra(P) {
      const { g, f, sw, ell, tri, line, susEye, walk } = P, c = '#c8a040', cd = '#9a7a28', bl = '#f0e0a8', t = now();
      for (let i = 0; i < 3; i++) ell(0, -3 - i * 4.2, 15 - i * 3, 4.4, i % 2 ? c : cd);
      for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) ell(-10 + i * 1.5 + k * 5 - i, -3 - i * 4.2, 1.2, 0.9, '#7a5a18');
      const sway = Math.sin(t * 2 + (walk || 0)) * 1.5;
      g.strokeStyle = c; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(f * 2, -14); g.quadraticCurveTo(f * 6 + sway, -26, f * 4 + sway, -38); g.stroke();
      g.strokeStyle = bl; g.lineWidth = 3.4; g.beginPath(); g.moveTo(f * 4, -16); g.quadraticCurveTo(f * 8 + sway, -27, f * 6.5 + sway, -37); g.stroke();
      ell(f * 4 + sway, -41, 10, 9, c); ell(f * 4 + sway, -40, 7.5, 7, cd); for (const k of [-1, 1]) ell(f * 4 + sway + k * 6, -40, 1.6, 2.4, '#3a2a10');   // cappuccio aperto
      ell(f * 5 + sway, -46, 6.5, 5, c); ell(f * 9.5 + sway, -44.6, 3.4, 2.4, c);
      susEye(f * 2.2 + sway, -46, 2.2, c); susEye(f * 7.8 + sway, -46, 2.2, c);
      line(f * 0, -49.5, f * 4, -48.6, '#5a4010', 1.1); line(f * 6, -48.8, f * 10, -50, '#5a4010', 1.1);
      if (Math.sin(t * 3) > 0.6) { line(f * 12.5 + sway, -44, f * 16 + sway, -44, '#e8343a', 0.8); line(f * 16 + sway, -44, f * 17.5 + sway, -45, '#e8343a', 0.7); line(f * 16 + sway, -44, f * 17.5 + sway, -43, '#e8343a', 0.7); }   // linguetta
      // sciarpa rosa di serie (sul collo, sempre)
      g.fillStyle = '#f08ab8'; g.beginPath(); g.ellipse(f * 5 + sway * 0.6, -33, 6.5, 2.8, -f * 0.2, 0, 7); g.fill();
      g.fillStyle = '#d86a9c'; g.beginPath(); g.moveTo(-f * 0 + sway * 0.6, -33); g.lineTo(-f * 5, -25 + Math.sin(t * 4) * 1); g.lineTo(-f * 2, -24); g.lineTo(f * 2 + sway * 0.6, -32); g.fill();
      for (const x of [-4.4, -2.8]) line(f * x, -25.5, f * (x - 0.6), -23.4, '#f08ab8', 0.8);
    },
    avocado(P) {
      const { g, f, sw, ell, line, susEye } = P, sk = '#3a5a1a', fl = '#c8e080', fy = '#e8f0a0';
      ell(-5 + sw, -1.2, 3.8, 2, '#3a2a1a'); ell(5 - sw, -1.2, 3.8, 2, '#3a2a1a'); line(-5 + sw, -2, -4, -6, sk, 1.8); line(5 - sw, -2, 4, -6, sk, 1.8);
      g.fillStyle = sk; g.beginPath(); g.moveTo(0, -44); g.bezierCurveTo(11, -44, 9, -30, 14, -20); g.bezierCurveTo(18, -8, 9, -4, 0, -4); g.bezierCurveTo(-9, -4, -18, -8, -14, -20); g.bezierCurveTo(-9, -30, -11, -44, 0, -44); g.fill();
      g.fillStyle = fl; g.beginPath(); g.moveTo(f * 1, -41); g.bezierCurveTo(f * 9.5, -41, f * 7, -29, f * 11.5, -20); g.bezierCurveTo(f * 14, -10, f * 7, -7, f * 1, -7); g.bezierCurveTo(-f * 5, -7, -f * 12, -10, -f * 9.5, -20); g.bezierCurveTo(-f * 6, -29, -f * 7, -41, f * 1, -41); g.fill();
      ell(f * 1, -14, 6, 6.5, fy); ell(f * 1.5, -15, 5, 5.5, '#8a5a2a'); ell(f * 0, -17, 1.6, 1.2, 'rgba(255,255,255,.35)');   // nocciolo
      line(f * 11, -22, f * 15, -17, sk, 1.8); line(-f * 11, -22, -f * 15, -16, sk, 1.8);
      susEye(f * -1, -30, 2.6, fl); susEye(f * 6, -30, 2.6, fl);
      line(f * -4, -34.2, f * 1.4, -33, '#3a5a1a', 1.3); line(f * 3.6, -33.4, f * 9, -35, '#3a5a1a', 1.3);
      g.strokeStyle = '#3a5a1a'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(f * 0.5, -24.6); g.quadraticCurveTo(f * 3, -25.3, f * 5.5, -26); g.stroke();
    },
  };

  // ---- collezione ----
  const coll = () => store.settings.coll || (store.settings.coll = {});
  const owned = id => BASE.includes(id) || (coll()[id] || 0) > 0;
  const heads = () => BASE.concat(ITEMS.filter(i => i.k === 'h' && owned(i.id)).map(i => i.id));
  const faces = () => ITEMS.filter(i => i.k === 'f' && owned(i.id)).map(i => i.id);
  const skins = () => ITEMS.filter(i => i.k === 'c' && owned(i.id)).map(i => i.id);
  const validHead = id => BASE.includes(id) || (BY[id] && BY[id].k === 'h');
  const validFace = id => !!(BY[id] && BY[id].k === 'f');
  const nameOf = id => BY[id] ? BY[id].n : (CQ_HATS.find(h => h[0] === id) || [0, id])[1];
  Object.assign(CQ_EYES, EYES);
  return { RAR, BASE, ITEMS, BY, SKINS, HEAD, FACE, hat, face, acc, top, draw, coll, owned, heads, faces, skins, validHead, validFace, nameOf };
})();
const CQ_SKINS_EX = CQX.SKINS;
