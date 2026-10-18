// Colpo all'hotel (furto cooperativo furtivo). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Usa i MODULI COMUNI (giochi/lib): guardie (ronde, cono di vista, ? -> !, telecamere), squadre (freccia sul bordo).
// GRAND HOTEL DI NOTTE, mappa FISSA (si impara a conoscerla): ala delle camere, uffici con la sala della sicurezza, la CELLA e il locale tecnico,
// bar, guardaroba, negozio di souvenir, hall, cucine, stanzino del custode, cortile sul retro col furgone; sotto l'INTERRATO (lavanderia, cantina, CAVEAU).
// TUTTI LADRI INSIEME contro le guardie del computer. Il DIAMANTE nel caveau e' sempre li', ma IL COLPO CAMBIA A OGNI PARTITA (G.plan):
//  1) come si scende all'interrato: ascensore di servizio (badge del direttore) / scala antincendio (chiave) / montacarichi (chiavetta dello chef);
//  2) la porta del caveau: tastierino (codice: post-it, due meta', registrazione ai monitor) / impronta del direttore / doppia serratura (in due);
//  3) la teca: laser (quadro elettrico) / sensore di peso (diamante finto) / cassaforte a combinazione (lenta e rumorosa); poi la FUGA al furgone.
// Si sa COSA serve (lavagna), non DOVE: i posti possibili sono indizi, quello vero e' a caso. PRESI = CELLA nella sala della sicurezza:
// la refurtiva va nell'armadio delle confische; i compagni liberano (4 s, rumore); dopo 60 s il prigioniero puo' tentare l'EVASIONE (se sbaglia: ALLERTA).
// Strumenti: 🪙 monetina (distrae), 👊 stordire da dietro, quadro elettrico (luci di un'ala per 40 s; una guardia va a controllare).
CQ_WAIT.colpo = cqLib('squadre', 'guardie').then(L => {
  const SQ = L.squadre, GD = L.guardie;
  for (const t of ['fdoor', 'lift', 'fgate', 'bdoor', 'wardrobe', 'coats', 'wine', 'boxes', 'column']) GD.tall.add(t);   // le porte chiuse e i mobili alti fermano la vista
  const W = 64, H = 58;
  const SRCH_T = 2, ACC_T = 1.5, PRT_T = 1.5, KP_T = 3, TURN_T = 1.2, TURN_WIN = 1.8, SWAP_T = 3, TAKE_T = 2, CMB_T = 12, FREE_T = 4, CONF_T = 2, LSR_T = 1.5;
  const EV_WAIT = 60, EV_CD = 25, ALERT_T = 60, DARK_T = 40, DARK_CD = 30, COINS = 3, COIN_R = 6.5, STUN_R = 1.25, OP_R = 1.5, VAN_R = 1.9, CELL_OPEN = 6;
  const LIT_R = 5.8, DARK_R = 3.1, MY_R = 3.4, SEE_G = 15;
  const ALA = { A: 'Ala delle camere', U: 'Uffici e sicurezza', T: 'Piano terra', I: 'Interrato' };
  const TC = '#ffcf5a';
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const MP = () => CQ_MAP;
  const P = c => cqModePos(c);
  const dxy = (c, x, y) => { const p = P(c); return Math.hypot(p.x - x, p.y - y); };
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const free = G => G.chars.filter(c => c.alive && !c.jail && !c.esc);
  const alertOn = G => !!(G.alP || G.time < (G.alE || 0));

  // ======================= MAPPA: GRAND HOTEL (fissa) =======================
  function mapHotel() {
    const rooms = [], doors = [], props = [], deco = [], lamps = [];
    const R = (n, x, y, w, h, k, c, wc, ala, o) => { rooms.push(Object.assign({ n, x, y, w, h, k, c, wc, ala }, o || {})); return rooms.length - 1; };
    const pp = (t, x, y, o) => props.push([t, x, y, o]);
    const D = (x, y, w, h) => doors.push([x, y, w, h]);
    const CAM = ['#5a3040', '#55303d'], CW = '#8c7a64';
    // ala delle camere: 4 sopra e 4 sotto il corridoio
    const camere = [];
    for (let i = 0; i < 8; i++) {
      const top = i < 4, x0 = 1 + 7 * (i % 4), y0 = top ? 1 : 12;
      R('Camera ' + (201 + i), x0, y0, 6, 7, 'carpet', CAM, CW, 'A', { ly: top ? y0 + 4 : y0 + 2.5 });
      D(x0 + 2, top ? 8 : 11, 2, 1);
      const by = top ? y0 + 1 : y0 + 6, ny = top ? y0 : y0 + 6;
      pp('bed', x0 + 3, by, { c: ['#8a3040', '#2f5a7a', '#5a6a3a', '#7a5a2a'][i % 4], head: top ? 'n' : 's' }); pp('bed', x0 + 2, by, { part: 1 }); pp('bed', x0 + 3, top ? by - 1 : by - 1 + 0, { part: 1 }); pp('bed', x0 + 2, top ? by - 1 : by - 1, { part: 1 });
      pp('nstand', x0 + 1, ny); pp('nstand', x0 + 4, ny); pp('wardrobe', x0, y0 + 3); pp('safe', x0, top ? y0 + 5 : y0 + 1);
      pp('desk', x0 + 5, top ? y0 + 4 : y0 + 2); pp('plant', x0 + 5, top ? y0 + 6 : y0);
      camere.push({ x0, y0, top, ns: [x0 + 1, ny], sf: [x0, top ? y0 + 5 : y0 + 1], door: [x0 + 2, top ? 8 : 11] });
    }
    // i letti sotto: la riga di dietro e' quella sopra (y0+5), il davanti e' y0+6
    const COR = ['#6e2626', '#6a2424'], CORW = '#7a5a48';
    R('Corridoio delle camere', 1, 9, 27, 2, 'hcarp', COR, CORW, 'A', { nl: 1 });
    R('Scale', 29, 1, 3, 19, 'hcarp', COR, CORW, 'A', { nl: 1 });
    D(28, 9, 1, 2); D(32, 9, 1, 2);
    pp('plant', 1, 10); pp('plant', 29, 1); pp('plant', 31, 1);
    // uffici
    R('Corridoio degli uffici', 33, 9, 30, 2, 'hcarp', COR, CORW, 'U', { nl: 1 });
    R('Ufficio del direttore', 33, 1, 10, 7, 'wood', ['#7a5a3a', '#74553a'], '#6a5a4a', 'U');
    D(36, 8, 2, 1);
    pp('desk', 37, 3); pp('desk', 38, 3); pp('dchair', 38, 2, ['#5a2a1a', 'n']); pp('shelf', 33, 1); pp('shelf', 34, 1); pp('coffee', 42, 1); pp('sofa', 42, 4); pp('sofa', 42, 5); pp('table', 40, 5); pp('plant', 33, 7); pp('lamp', 41, 1);
    R('Sala della sicurezza', 44, 1, 11, 7, 'tile', ['#4a525c', '#465058'], '#3e4650', 'U');
    D(48, 8, 2, 1);
    pp('camdesk', 46, 1); pp('camdesk', 47, 1); pp('camdesk', 48, 1); pp('locker', 44, 6, '#7a4a3a'); pp('locker', 44, 5, '#5a6a7a'); pp('coffee', 53, 1); pp('table', 51, 4);
    const cell = R('Cella', 56, 1, 7, 7, 'concrete', ['#5a5a58', '#565654'], '#3e4650', 'U');
    D(55, 3, 1, 2); pp('cdoor', 55, 3, { v: 1 }); pp('cdoor', 55, 4, { v: 1 });
    pp('cot', 62, 2); pp('bucket', 62, 7);
    R('Segreteria', 33, 12, 8, 7, 'wood', ['#6a5038', '#654c36'], '#6a5a4a', 'U');
    D(35, 11, 2, 1);
    pp('desk', 37, 15); pp('desk', 38, 15); pp('dchair', 37, 16, ['#3a3a5a', 's']); pp('shelf', 33, 14); pp('shelf', 33, 15); pp('monitor', 40, 15); pp('plant', 40, 18);
    R('Locale tecnico', 42, 12, 7, 7, 'concrete', ['#4e504e', '#4a4c4a'], '#3e4248', 'U');
    D(44, 11, 2, 1);
    pp('fusebox', 48, 15); pp('generator', 42, 17); pp('crate', 47, 18); pp('barrel', 42, 13); pp('shelf', 48, 12);
    R('Spogliatoio', 50, 12, 13, 7, 'tile', ['#6a7a78', '#647472'], '#4a5a58', 'U');
    D(55, 11, 2, 1); D(56, 19, 2, 1);
    for (const x of [50, 51, 52, 53]) pp('locker', x, 12, '#4a6a8a'); for (const x of [58, 59, 60, 61, 62]) pp('locker', x, 12, '#6a4a6a');
    pp('mirror', 62, 15); pp('plant', 50, 18);
    // piano terra
    const big = R('Corridoio', 1, 20, 62, 3, 'hcarp', COR, CORW, 'T', { nl: 1 });
    pp('plant', 1, 20); pp('plant', 62, 20); pp('plant', 20, 22); pp('plant', 40, 22);
    R('Bar', 1, 24, 14, 12, 'wood', ['#5a3a26', '#553824'], '#4a2e22', 'T');
    D(6, 23, 3, 1);
    for (const x of [2, 3, 4, 5]) pp('counter', x, 27); pp('shelf', 1, 24); pp('shelf', 2, 24); pp('shelf', 3, 24); pp('shelf', 4, 24);
    for (const [x, y] of [[9, 28], [12, 28], [9, 32], [12, 32]]) pp('rtable', x, y);
    pp('plant', 14, 24); pp('plant', 14, 35); pp('lamp', 1, 31);
    R('Guardaroba', 16, 24, 6, 5, 'carpet', ['#3a4a5a', '#384858'], '#6a5a4a', 'T');
    D(18, 23, 2, 1); D(22, 26, 1, 2);
    for (const y of [24, 25, 26, 27, 28]) pp('coats', 16, y); pp('mirror', 21, 24);
    R('Negozio di souvenir', 16, 30, 6, 6, 'tile', ['#8a7a68', '#857564'], '#6a5a4a', 'T', { ly: 32.5 });
    D(22, 32, 1, 2);
    pp('vitrine', 17, 31); pp('vitrine', 18, 31); pp('vitrine', 17, 34); pp('vitrine', 18, 34); pp('shelf', 16, 35); pp('shelf', 21, 35);
    R('Hall', 23, 24, 17, 12, 'marble', ['#c8bfae', '#bfb6a4'], '#6e3b34', 'T');
    D(28, 23, 6, 1); D(40, 27, 1, 2);
    for (const y of [29, 30, 31, 32]) pp('counter', 26, y); pp('monitor', 25, 31); pp('plant', 23, 24); pp('plant', 39, 24); pp('plant', 23, 35);
    pp('sofa', 35, 26); pp('sofa', 36, 26); pp('sofa', 37, 26); pp('rtable', 36, 28); pp('lamp', 38, 31); pp('sofa', 35, 33); pp('sofa', 36, 33);
    R('Cucine', 41, 24, 14, 12, 'tile', ['#b8bcc0', '#b0b4b8'], '#7a8288', 'T');
    D(46, 23, 2, 1); D(55, 32, 1, 2);
    for (const x of [49, 50, 51]) pp('stove', x, 24); pp('fridge', 53, 24); pp('fridge', 54, 24);
    for (const x of [44, 45, 46, 47]) pp('counter', x, 29); pp('pot', 50, 29); pp('shelf', 41, 33); pp('crate', 52, 35); pp('bucket', 41, 35);
    R('Stanzino del custode', 56, 24, 7, 5, 'concrete', ['#5e5a52', '#5a564e'], '#4a4038', 'T', { ly: 26 });
    D(58, 23, 2, 1); D(58, 29, 2, 1);
    pp('desk', 61, 25); pp('shelf', 56, 26); pp('bucket', 62, 28); pp('crate', 56, 28);
    R('Cortile', 56, 30, 7, 8, 'asphalt', ['#2e3034', '#2c2e32'], '#4a3a32', 'X');
    pp('van', 60, 35, { on: 1 }); pp('van', 59, 35, { part: 1 }); pp('barrel', 62, 30); pp('crate', 56, 37); pp('cone', 57, 36);
    // passaggi verso l'interrato (quello aperto stanotte lo decide la partita): porte chiuse sopra, aperte sotto
    const PS = ['#4a4846', '#464442'], PSW = '#383634';
    R('Scala antincendio', 2, 37, 2, 6, 'stairs', PS, PSW, 'I', { nl: 1 });
    R('Ascensore di servizio', 31, 37, 2, 6, 'liftf', PS, PSW, 'I', { nl: 1 });
    R('Montacarichi', 48, 37, 2, 6, 'liftf', PS, PSW, 'I', { nl: 1 });
    D(2, 36, 2, 1); D(31, 36, 2, 1); D(48, 36, 2, 1); D(2, 43, 2, 1); D(31, 43, 2, 1); D(48, 43, 2, 1);
    pp('fdoor', 2, 36); pp('fdoor', 3, 36); pp('lift', 31, 36); pp('lift', 32, 36); pp('fgate', 48, 36); pp('fgate', 49, 36);
    // interrato
    R('Corridoio dell\'interrato', 1, 44, 62, 2, 'concrete', ['#4c4a48', '#484644'], '#34322f', 'I', { nl: 1 });
    R('Lavanderia', 1, 47, 19, 9, 'tile', ['#7a8a96', '#748490'], '#3e4a52', 'I');
    D(8, 46, 2, 1);
    for (const x of [2, 3, 4, 5, 6]) pp('washer', x, 55); pp('rtable', 12, 50); pp('rtable', 15, 50); pp('crate', 19, 47); pp('shelf', 19, 52); pp('shelf', 19, 53); pp('bucket', 1, 47);
    const vault = R('Caveau', 22, 47, 20, 9, 'vault', ['#5a6068', '#565c64'], '#2a2e34', 'I', { ly: 54.5 });
    D(31, 46, 2, 1); pp('bdoor', 32, 46); pp('bdoor', 31, 46, { part: 1 });
    pp('teca', 31, 51);
    for (const y of [48, 50, 52, 54]) { pp('gold', 22, y); pp('gold', 41, y); }
    for (const y of [49, 51, 53]) { pp('boxes', 22, y); pp('boxes', 41, y); }
    R('Cantina', 44, 47, 19, 9, 'stone', ['#4a4036', '#463c34'], '#3a2e26', 'I');
    D(52, 46, 2, 1);
    for (const x of [44, 45, 46, 47, 48, 49]) { pp('wine', x, 49); pp('wine', x, 52); } for (const x of [56, 57, 58, 59, 60, 61]) { pp('wine', x, 49); pp('wine', x, 52); }
    pp('barrel', 62, 55); pp('barrel', 61, 55); pp('barrel', 44, 55);
    pp('pipe', 62, 44);
    // COLONNE di marmo nei corridoi: spezzano la vista delle guardie (ci si nasconde dietro)
    for (const [x, y] of [[6, 9], [13, 10], [20, 9], [26, 10], [40, 9], [46, 10], [53, 9], [59, 10], [8, 20], [15, 22], [23, 20], [37, 22], [44, 20], [51, 22], [58, 20], [11, 44], [20, 45], [41, 44], [57, 45]]) pp('column', x, y);
    // telecamere (su un palo in un angolo): angolo di partenza a0, quanto girano sw, periodo per
    const cams = [
      { x: 38.5, y: 34.5, p: [38, 34], a0: Math.atan2(-5, -6), sw: 0.75, per: 9, r: 8.5, h: 0.4 },
      { x: 1.5, y: 21.5, p: null, a0: 0, sw: 0.25, per: 8, r: 10, h: 0.36 },
      { x: 62.5, y: 9.5, p: null, a0: Math.PI, sw: 0.3, per: 7, r: 9.5, h: 0.38 },
      { x: 62.5, y: 44.5, p: null, a0: Math.PI, sw: 0.25, per: 8, r: 11, h: 0.36 },
      { x: 1.5, y: 45.5, p: null, a0: 0, sw: 0.25, per: 10, r: 11, h: 0.36 },
      { x: 53.5, y: 34.5, p: [53, 34], a0: Math.atan2(-6, -7), sw: 0.6, per: 8, r: 8, h: 0.4 }];
    cams.forEach(c => { if (c.p) pp('hcam', c.p[0], c.p[1]); });
    // posti dove frugare (x, y = l'oggetto della mappa)
    const SP = {
      giacca: { n: 'giacca del direttore', x: 16, y: 26, i: '🧥' }, recep: { n: 'cassetto della reception', x: 26, y: 30, i: '🗄️' }, custode: { n: 'scrivania del custode', x: 61, y: 25, i: '🗄️' },
      armad: { n: "armadietto dello chef", x: 52, y: 12, i: '🚪' }, bcuc: { n: 'bancone della cucina', x: 47, y: 29, i: '🍳' }, postit: { n: 'scrivania del direttore', x: 37, y: 3, i: '📝' },
      agenda: { n: 'agenda della segretaria', x: 37, y: 15, i: '📒' }, monit: { n: 'monitor della sicurezza', x: 47, y: 1, i: '📺' }, bicch: { n: 'bancone del bar', x: 4, y: 27, i: '🥃' },
      tazz: { n: 'tazzina del direttore', x: 38, y: 3, i: '☕' }, kUff: { n: 'scaffale dell\'ufficio', x: 34, y: 1, i: '📚' }, kSpo: { n: 'armadietto dello spogliatoio', x: 60, y: 12, i: '🚪' },
      kCus: { n: 'scaffale del custode', x: 56, y: 26, i: '📚' }, kLav: { n: 'lavatrice', x: 4, y: 55, i: '🧺' }, kCan: { n: 'scaffale dei vini', x: 58, y: 52, i: '🍷' },
      vetr: { n: 'vetrina dei souvenir', x: 17, y: 31, i: '💎' }, comod: { n: 'comodino del direttore', x: 0, y: 0, i: '🛏️' }, safe: { n: 'cassaforte della camera', x: 0, y: 0, i: '🔒' },
      conf: { n: 'armadio delle confische', x: 44, y: 6, i: '📦' }, quadro: { n: 'quadro elettrico', x: 48, y: 15, i: '⚡' } };
    // guardie: giri di ronda [x, y, attesa, dove guarda]
    const routes = {
      cella: { post: 1, n: 'carceriere', route: [[50.5, 4.5, 4, 0], [52.5, 6.5, 3, 0], [48.5, 6.5, 3, 1.57], [51.5, 3.5, 3, 3.14]] },
      grande: { route: [[3.5, 21.5, 2, 0], [30.5, 21.5, 1.5, 1.57], [60.5, 21.5, 2, 3.14], [30.5, 21.5, 1.5, -1.57]] },
      interrato: { route: [[3.5, 44.5, 2, 0], [31.5, 45.5, 2, 1.57], [60.5, 44.5, 2, 3.14], [53.5, 50.5, 2, 1.57], [31.5, 45.5, 1, 0], [10.5, 50.5, 2, 1.57]] },
      hall: { route: [[30.5, 27.5, 2, 1.57], [8.5, 30.5, 2, 0], [18.5, 26.5, 1.5, 0], [37.5, 31.5, 2, 3.14]] },
      camere: { route: [[2.5, 9.5, 2, 0], [27.5, 9.5, 1, 0], [30.5, 2.5, 2, 1.57], [30.5, 17.5, 1, -1.57], [20.5, 10.5, 1, 3.14]] },
      uffici: { route: [[34.5, 9.5, 1, 0], [38.5, 5.5, 2, -1.57], [36.5, 13.5, 2, 1.57], [45.5, 14.5, 2, 0], [61.5, 10.5, 2, 3.14]] },
      cucine: { route: [[44.5, 26.5, 2, 0], [52.5, 31.5, 2, 3.14], [59.5, 26.5, 2, 1.57], [47.5, 33.5, 2, -1.57]] },
      negozio: { route: [[18.5, 33.5, 2, 0], [28.5, 30.5, 2, 0], [30.5, 21.5, 2, 1.57], [12.5, 30.5, 2, 0]] } };
    // luci del soffitto: una ogni 4 caselle in ogni stanza (si spengono per ala dal quadro elettrico)
    rooms.forEach(r => { if (r.ala === 'X') return; for (let y = r.y + 1; y < r.y + r.h; y += 4) for (let x = r.x + 1; x < r.x + r.w; x += 4) lamps.push([x + 0.5, y + 0.5, r.ala]); });
    lamps.push([58.5, 31.5, 'X'], [61.5, 33.5, 'X']);
    // per ogni casella: la stanza e l'ala
    const ri = (x, y) => { for (let i = rooms.length - 1; i >= 0; i--) { const r = rooms[i]; if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i; } return -1; };
    const ROOM = new Int8Array(W * H).fill(-1); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ROOM[y * W + x] = ri(x, y);
    for (const [x0, y0, w, h] of doors) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const a = ri(x, y - 1) >= 0 ? ri(x, y - 1) : ri(x - 1, y); ROOM[y * W + x] = y0 === 36 || y0 === 43 || y0 === 46 ? rooms.findIndex(r => r.ala === 'I') : a; }
    // porte sbarrate (passaggi e caveau): caselle e lato da cui si usano
    const gates = {
      sca: { c: [[2, 36], [3, 36]], s: [3, 35.5], n: 'scala antincendio', e: '🚪' },
      asc: { c: [[31, 36], [32, 36]], s: [32, 35.5], n: 'ascensore di servizio', e: '🛗' },
      mon: { c: [[48, 36], [49, 36]], s: [49, 35.5], n: 'montacarichi', e: '📦' } };
    const vdoor = { c: [[31, 46], [32, 46]], s: [32, 45.5], kl: [30.5, 45.5], kr: [33.5, 45.5] };
    const teca = { x: 31, y: 51 };
    const jail = [[57.5, 3.5], [59.5, 3.5], [57.5, 5.5], [59.5, 5.5], [61.5, 4.5], [58.5, 2.5]], cellOut = [54.2, 4];
    const ring = [[58, 32], [59, 32], [60, 32], [57, 33], [58, 33], [59, 33], [57, 34], [58, 34], [57, 35], [61, 32]];
    return { w: W, h: H, rooms, doors, decals: [], props, tasks: [], hall: big, cams: [], vending: [], ring, button: { x: -10, y: -10 }, sabs: {}, inn: {}, help: '', btnTxt: '', sabTxt: '',
      deco, draw, floor: FLOOR, decoDraw, bg: () => '#07080b',
      hcams: cams, SP, routes, lamps, ROOM, gates, vdoor, teca, jail, cellOut, camere, cellRoom: cell, vaultRoom: vault, van: { x: 59.6, y: 34.4 } };
  }
  const roomAt = (x, y) => { const M = MP(), xi = Math.floor(x), yi = Math.floor(y); return xi < 0 || yi < 0 || xi >= W || yi >= H ? -1 : M.ROOM[yi * W + xi]; };
  const alaAt = (x, y) => { const r = roomAt(x, y); return r >= 0 ? MP().rooms[r].ala : null; };
  const darkAt = (G, x, y) => { const a = alaAt(x, y); return !!(a && a !== 'X' && G.dk && G.time < (G.dk[a] || 0)); };
  const inRoom = (x, y, i) => { const r = MP().rooms[i]; return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; };

  // ---- disegno della mappa (K = attrezzi di cqTools). REGOLA DELLE LUCI: aloni solo con K.glow, colori pieni negli oggetti ----
  const FLOOR = {
    hcarp(K, x, y) {   // passatoia rossa dei corridoi con il bordo dorato
      const Pp = (u, v) => K.S(x + u, y + v, 0), r = roomAt(x, y), R = r >= 0 ? MP().rooms[r] : null;
      K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], (x + y) % 2 ? '#6a2424' : '#6e2626');
      if (K.TW < 40 || !R) return;
      const edge = (dx, dy) => { const o = roomAt(x + dx, y + dy); return o !== r && !(o >= 0 && MP().rooms[o].k === 'hcarp'); };
      if (edge(0, -1)) K.strokes([[Pp(0, 0.12), Pp(1, 0.12)]], '#b8963a', Math.max(1.5, K.TW / 26)); if (edge(0, 1)) K.strokes([[Pp(0, 0.88), Pp(1, 0.88)]], '#b8963a', Math.max(1.5, K.TW / 26));
      if (edge(-1, 0)) K.strokes([[Pp(0.12, 0), Pp(0.12, 1)]], '#b8963a', Math.max(1.5, K.TW / 26)); if (edge(1, 0)) K.strokes([[Pp(0.88, 0), Pp(0.88, 1)]], '#b8963a', Math.max(1.5, K.TW / 26));
      if ((x * 3 + y * 5) % 7 === 0) K.dot(x + 0.5, y + 0.5, 0, 0.05, '#8a3a2a');
    },
    marble(K, x, y) {   // marmo chiaro della hall a scacchi con le venature
      const Pp = (u, v) => K.S(x + u, y + v, 0); K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], (x + y) % 2 ? '#c4baa6' : '#d4ccbc');
      if (K.TW < 40) return; const a = K.hsh(x, y, 5), b = K.hsh(x, y, 6);
      K.strokes([[Pp(0.1, a), Pp(0.5, b)], [Pp(0.5, b), Pp(0.9, (a + b) / 2)]], 'rgba(120,110,95,.25)');
      K.strokes([[Pp(0.03, 0.03), Pp(0.97, 0.03)], [Pp(0.03, 0.03), Pp(0.03, 0.97)]], 'rgba(255,255,255,.18)');
    },
    vault(K, x, y) {   // lastre d'acciaio con i rivetti
      const Pp = (u, v) => K.S(x + u, y + v, 0); K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], (x + y) % 2 ? '#565c64' : '#5c626a');
      if (K.TW < 40) return; K.strokes([[Pp(0, 0.02), Pp(1, 0.02)], [Pp(0.02, 0), Pp(0.02, 1)]], 'rgba(0,0,0,.25)');
      for (const [u, v] of [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]) K.dot(x + u, y + v, 0, 0.03, '#7a8088');
    },
    stairs(K, x, y) {   // gradini che scendono
      const Pp = (u, v) => K.S(x + u, y + v, 0); K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], '#4a4846');
      const L = []; for (let i = 0; i < 4; i++) L.push([Pp(0, i / 4 + 0.05), Pp(1, i / 4 + 0.05)]); K.strokes(L, '#2e2c2a', Math.max(2, K.TW / 18));
      K.strokes([[Pp(0, 0.5), Pp(1, 0.5)]], 'rgba(200,190,170,.15)');
    },
    liftf(K, x, y) {   // pavimento di lamiera a rombi
      const Pp = (u, v) => K.S(x + u, y + v, 0); K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], '#5a5c5e');
      if (K.TW < 40) return; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) K.dot(x + 0.2 + i * 0.3, y + 0.2 + j * 0.3, 0, 0.035, '#76787a');
    }
  };
  function decoDraw() {}
  // porta in un varco del muro: lastra in piedi a meta' della casella (v = varco in un muro verticale)
  const slab = (K, x, y, v, z, col) => v ? K.bx(x + 0.38, y, x + 0.62, y + 1, 0, z, col) : K.bx(x, y + 0.38, x + 1, y + 0.62, 0, z, col);
  function draw(K, t, x, y, o) {
    const { bx, cyl, dot, glow, line, S, poly, qL } = K, g = K.g, TW = K.TW;
    o = o || {};
    switch (t) {
      case 'bed': {   // letto matrimoniale 2x2, disegnato dalla casella davanti
        if (o.part) break; const x0 = x - 1, y0 = y - 1, n = o.head === 'n';
        bx(x0 + 0.08, y0 + 0.08, x + 0.92, y + 0.92, 0, 0.38, '#5a3a24');
        bx(x0 + 0.12, y0 + 0.12, x + 0.88, y + 0.88, 0.38, 0.55, '#ece6da');
        if (n) { bx(x0 + 0.12, y0 + 0.75, x + 0.88, y + 0.88, 0.55, 0.62, o.c); bx(x0 + 0.08, y0 + 0.02, x + 0.92, y0 + 0.14, 0, 1.15, '#4a2e1c'); for (const u of [0.3, 1.1]) bx(x0 + u, y0 + 0.2, x0 + u + 0.55, y0 + 0.55, 0.55, 0.7, '#f6f2ea'); }
        else { bx(x0 + 0.12, y0 + 0.12, x + 0.88, y + 0.25, 0.55, 0.62, o.c); for (const u of [0.3, 1.1]) bx(x0 + u, y + 0.45, x0 + u + 0.55, y + 0.8, 0.55, 0.7, '#f6f2ea'); bx(x0 + 0.08, y + 0.86, x + 0.92, y + 0.98, 0, 1.15, '#4a2e1c'); }
        break; }
      case 'nstand': bx(x + 0.2, y + 0.2, x + 0.8, y + 0.8, 0, 0.55, '#6a4a30'); qL(x + 0.25, x + 0.75, y + 0.8, 0.25, 0.27, '#3a2818'); cyl(x + 0.5, y + 0.45, 0.06, 0.55, 0.8, '#c8b48a'); cyl(x + 0.5, y + 0.45, 0.2, 0.8, 1.05, '#f2e2b8'); glow(x + 0.5, y + 0.45, 0.95, 1.1, 'rgba(255,220,150,.35)'); break;
      case 'wardrobe': bx(x + 0.08, y + 0.1, x + 0.92, y + 0.9, 0, 1.9, '#6a4a30'); qL(x + 0.12, x + 0.49, y + 0.9, 0.1, 1.8, '#74523a'); qL(x + 0.51, x + 0.88, y + 0.9, 0.1, 1.8, '#74523a'); dot(x + 0.45, y + 0.9, 1.0, 0.025, '#d8c070'); dot(x + 0.55, y + 0.9, 1.0, 0.025, '#d8c070'); break;
      case 'safe': bx(x + 0.18, y + 0.2, x + 0.82, y + 0.8, 0, 0.7, '#3a3e44'); qL(x + 0.24, x + 0.76, y + 0.8, 0.08, 0.62, '#4a4f56'); dot(x + 0.5, y + 0.8, 0.36, 0.08, '#8a8e94'); dot(x + 0.5, y + 0.8, 0.36, 0.03, '#2a2a2a'); break;
      case 'cot': bx(x + 0.15, y + 0.05, x + 0.85, y + 0.95, 0, 0.35, '#5a5e64'); bx(x + 0.18, y + 0.08, x + 0.82, y + 0.92, 0.35, 0.45, '#8a8470'); break;
      case 'rtable': cyl(x + 0.5, y + 0.5, 0.06, 0, 0.72, '#2a2a2a'); cyl(x + 0.5, y + 0.5, 0.4, 0.72, 0.8, '#e8e2d4'); dot(x + 0.45, y + 0.45, 0.82, 0.05, '#c8a040'); break;
      case 'coats': bx(x + 0.1, y + 0.1, x + 0.9, y + 0.2, 0, 1.75, '#4a3a2a'); for (let i = 0; i < 3; i++) { const c = ['#2a2a32', '#5a2a2a', '#3a4a3a'][(i + x + y) % 3]; bx(x + 0.15 + i * 0.25, y + 0.2, x + 0.35 + i * 0.25, y + 0.45, 0.6, 1.6, c); } break;
      case 'vitrine': bx(x + 0.08, y + 0.1, x + 0.92, y + 0.9, 0, 0.7, '#5a4a3a'); bx(x + 0.12, y + 0.14, x + 0.88, y + 0.86, 0.7, 0.72, '#8ab8c8'); for (let i = 0; i < 3; i++) dot(x + 0.25 + i * 0.25, y + 0.5, 0.78, 0.04, ['#e8f4ff', '#f2c84a', '#d84a7a'][i]);
        line(S(x + 0.12, y + 0.86, 0.72), S(x + 0.12, y + 0.86, 1.25), '#c8e0e8', 1); line(S(x + 0.88, y + 0.86, 0.72), S(x + 0.88, y + 0.86, 1.25), '#c8e0e8', 1); line(S(x + 0.12, y + 0.86, 1.25), S(x + 0.88, y + 0.86, 1.25), '#c8e0e8', 1); line(S(x + 0.88, y + 0.14, 1.25), S(x + 0.88, y + 0.86, 1.25), '#c8e0e8', 1); break;
      case 'washer': bx(x + 0.1, y + 0.12, x + 0.9, y + 0.88, 0, 1.0, '#e4e8ec'); dot(x + 0.5, y + 0.88, 0.5, 0.17, '#3a4a5a'); dot(x + 0.5, y + 0.88, 0.5, 0.11, '#6a8aa8'); qL(x + 0.15, x + 0.85, y + 0.88, 0.85, 0.95, '#b8c0c8'); break;
      case 'wine': bx(x + 0.05, y + 0.25, x + 0.95, y + 0.75, 0, 1.9, '#4a3020'); for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) dot(x + 0.22 + i * 0.28, y + 0.75, 0.3 + r * 0.42, 0.055, (r + i + x) % 3 ? '#2a1a2a' : '#3a5a2a'); break;
      case 'gold': bx(x + 0.1, y + 0.15, x + 0.9, y + 0.85, 0, 0.9, '#3a3e44'); for (let r = 0; r < 2; r++) for (let i = 0; i < 2; i++) bx(x + 0.18 + i * 0.36, y + 0.3, x + 0.48 + i * 0.36, y + 0.7, 0.9 + r * 0.14, 1.02 + r * 0.14, '#e8b830'); glow(x + 0.5, y + 0.5, 1.1, 0.9, 'rgba(255,210,90,.25)'); break;
      case 'boxes': bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0, 1.8, '#6a7078'); for (let r = 0; r < 4; r++) for (let i = 0; i < 2; i++) { qL(x + 0.12 + i * 0.4, x + 0.48 + i * 0.4, y + 0.95, 0.1 + r * 0.42, 0.45 + r * 0.42, '#8a9098'); dot(x + 0.3 + i * 0.4, y + 0.95, 0.28 + r * 0.42, 0.02, '#2a2a2a'); } break;
      case 'column': cyl(x + 0.5, y + 0.5, 0.42, 0, 0.18, '#b8b0a0'); cyl(x + 0.5, y + 0.5, 0.32, 0.18, 2.25, '#d8d0c0'); cyl(x + 0.5, y + 0.5, 0.42, 2.25, 2.45, '#b8b0a0'); break;
      case 'pipe': bx(x + 0.3, y + 0.3, x + 0.7, y + 0.7, 0, 1.8, '#6a5a4a'); cyl(x + 0.5, y + 0.5, 0.25, 0.4, 0.6, '#c8402a'); break;
      case 'hcam': cyl(x + 0.5, y + 0.5, 0.05, 0, 1.75, '#3a3e44'); bx(x + 0.3, y + 0.3, x + 0.62, y + 0.55, 1.65, 1.88, '#d8dce0'); dot(x + 0.35, y + 0.35, 1.78, 0.045, '#1a1a1a'); break;
      case 'cdoor': {   // sbarre della cella
        const v = o.v, L2 = []; for (let i = 1; i < 6; i++) { const u = i / 6; L2.push(v ? [S(x + 0.5, y + u, 0), S(x + 0.5, y + u, 1.7)] : [S(x + u, y + 0.5, 0), S(x + u, y + 0.5, 1.7)]); }
        K.strokes(L2, '#8a9098', Math.max(2, TW / 14)); slab(K, x, y, v, 0.08, '#5a6068'); v ? bx(x + 0.42, y, x + 0.58, y + 1, 1.62, 1.75, '#5a6068') : bx(x, y + 0.42, x + 1, y + 0.58, 1.62, 1.75, '#5a6068'); break; }
      case 'fdoor': slab(K, x, y, 0, 1.75, '#a8322a'); qL(x + 0.1, x + 0.9, y + 0.62, 0.8, 0.9, '#d8d8d0'); if (x === 2) { bx(x + 0.6, y + 0.5, x + 1.4, y + 0.62, 1.9, 2.15, '#2a8a4a'); glow(x + 1, y + 0.6, 2.0, 0.8, 'rgba(90,255,140,.35)'); } break;
      case 'lift': slab(K, x, y, 0, 1.8, '#9aa2aa'); qL(x + (x === 31 ? 0.95 : 0), x + (x === 31 ? 1 : 0.05), y + 0.62, 0, 1.8, '#4a4f56'); if (x === 32) { bx(x + 0.15, y + 0.55, x + 0.35, y + 0.65, 0.9, 1.25, '#2a2e34'); dot(x + 0.25, y + 0.66, 1.15, 0.03, '#f2c84a'); dot(x + 0.25, y + 0.66, 1.0, 0.03, '#f2c84a'); } break;
      case 'fgate': { slab(K, x, y, 0, 0.12, '#2a2a2a'); const L2 = []; for (let i = 0; i < 5; i++) L2.push([S(x + i * 0.25, y + 0.5, 0.1), S(x + i * 0.25, y + 0.5, 1.6)]); K.strokes(L2, '#c8a828', Math.max(2, TW / 16)); bx(x, y + 0.42, x + 1, y + 0.58, 1.55, 1.7, '#2a2a2a'); break; }
      case 'bdoor': {   // porta blindata rotonda del caveau (2 caselle, disegnata da quella di destra)
        if (o.part) break; const cx0 = x, cy0 = y + 0.6;
        bx(x - 1, y + 0.3, x + 1, y + 0.7, 0, 2.0, '#3a3e44');
        const [X, Y] = S(cx0, cy0 + 0.05, 1.0); g.fillStyle = '#9aa0a8'; g.beginPath(); g.ellipse(X, Y, TW * 0.62, TW * 0.62, 0, 0, 7); g.fill();
        g.fillStyle = '#7a8088'; g.beginPath(); g.ellipse(X, Y, TW * 0.5, TW * 0.5, 0, 0, 7); g.fill();
        g.strokeStyle = '#4a4f56'; g.lineWidth = Math.max(2, TW / 14); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(X - Math.cos(a) * TW * 0.34, Y - Math.sin(a) * TW * 0.34); g.lineTo(X + Math.cos(a) * TW * 0.34, Y + Math.sin(a) * TW * 0.34); g.stroke(); }
        g.fillStyle = '#c8ccd2'; g.beginPath(); g.arc(X, Y, TW * 0.1, 0, 7); g.fill(); break; }
      case 'teca': {   // piedistallo con la teca di vetro (il diamante si disegna in partita)
        bx(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0, 0.95, '#2a2e36'); bx(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0.95, 1.02, '#c8a040');
        const c = '#bfe0ec', w = Math.max(1, TW / 30);
        for (const [a, b] of [[0.15, 0.85], [0.85, 0.85], [0.85, 0.15]]) line(S(x + a, y + b, 1.02), S(x + a, y + b, 1.7), c, w);
        line(S(x + 0.15, y + 0.85, 1.7), S(x + 0.85, y + 0.85, 1.7), c, w); line(S(x + 0.85, y + 0.85, 1.7), S(x + 0.85, y + 0.15, 1.7), c, w); line(S(x + 0.15, y + 0.15, 1.7), S(x + 0.85, y + 0.15, 1.7), c, w); line(S(x + 0.15, y + 0.15, 1.7), S(x + 0.15, y + 0.85, 1.7), c, w);
        glow(x + 0.5, y + 0.5, 1.2, 1.5, 'rgba(160,220,255,.3)'); break; }
    }
  }
  CQ_MAPS.grandhotel = { n: 'Grand Hotel di notte', make: mapHotel, only: 'colpo' };

  // ======================= IL COLPO (cambia a ogni partita) =======================
  // tipi: a = come si scende, b = porta del caveau (bc = da dove viene il codice), c = teca
  const ACC = { asc: { it: 'badge', cand: ['giacca', 'comod', 'guard'] }, sca: { it: 'kSca', cand: ['recep', 'custode'] }, mon: { it: 'kMon', cand: ['armad', 'bcuc'] } };
  const KIND = {
    badge: ['💳', 'il badge del direttore'], kSca: ['🔑', 'la chiave della scala antincendio'], kMon: ['🔑', 'la chiavetta del montacarichi'], imp: ['🖐️', "l'impronta del direttore"],
    kA: ['🗝️', 'la prima chiave del caveau'], kB: ['🗝️', 'la seconda chiave del caveau'], fake: ['💠', 'il diamante finto'], diam: ['💎', 'il DIAMANTE'] };
  function makePlan(G) {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const pl = G.plan = { a: pick(['asc', 'sca', 'mon']), b: pick(['tas', 'imp', 'dop']), bc: pick(['post', 'split', 'mon']), c: pick(['las', 'pes', 'cmb']), dr: Math.floor(Math.random() * 8), gb: -1, code: String(1000 + Math.floor(Math.random() * 9000)) };
    if (window.__PLAN) Object.assign(pl, window.__PLAN);   // prove
    const it = G.it = [], add = (k, s) => it.push({ k, s, c: -1, st: 0 });
    add(ACC[pl.a].it, pick(ACC[pl.a].cand));
    if (pl.b === 'imp') add('imp', pick(['bicch', 'tazz']));
    if (pl.b === 'dop') { add('kA', pick(['kUff', 'kSpo', 'kCus'])); add('kB', pick(['kLav', 'kCan'])); }
    if (pl.c === 'pes') add('fake', 'vetr');
    add('diam', 'teca');
    const b = it.find(i => i.s === 'guard'); if (b) { const cand = G.gd.filter(g => !g.post); pl.gb = cand.length ? cand[Math.floor(Math.random() * cand.length)].id : -1; if (pl.gb < 0) b.s = 'giacca'; }
  }
  // i posti dove frugare per questo colpo (con la camera del direttore)
  function spot(G, k) {
    const M = MP(), S = M.SP[k]; if (!S) return null;
    if (k === 'comod' || k === 'safe') { const r = M.camere[G.plan.dr], p = k === 'comod' ? r.ns : r.sf; return Object.assign({}, S, { x: p[0], y: p[1] }); }
    return S;
  }
  // posti utili adesso (da frugare): quelli degli oggetti che servono e non sono ancora stati trovati, piu' le meta' del codice
  function needSpots(G) {
    const pl = G.plan, out = [];
    if (!G.o1) { const it = G.it.find(i => i.k === ACC[pl.a].it); if (it && it.st === 0) for (const s of ACC[pl.a].cand) if (!G.sr[s] && s !== 'guard') out.push(s); }
    if (!G.o2) {
      if (pl.b === 'tas') { if (pl.bc === 'post' && !G.ck[0]) out.push('postit'); if (pl.bc === 'mon' && !G.ck[0]) out.push('monit'); if (pl.bc === 'split') { if (!G.ck[0]) out.push('agenda'); if (!G.ck[1]) out.push('safe'); } }
      if (pl.b === 'imp') { const it = G.it.find(i => i.k === 'imp'); if (it && it.st === 0) for (const s of ['bicch', 'tazz']) if (!G.sr[s]) out.push(s); }
      if (pl.b === 'dop') { for (const [k, C] of [['kA', ['kUff', 'kSpo', 'kCus']], ['kB', ['kLav', 'kCan']]]) { const it = G.it.find(i => i.k === k); if (it && it.st === 0) for (const s of C) if (!G.sr[s]) out.push(s); } }
    }
    if (!G.o3 && pl.c === 'pes') { const it = G.it.find(i => i.k === 'fake'); if (it && it.st === 0 && !G.sr.vetr) out.push('vetr'); }
    return out;
  }
  const has = (G, k) => G.it.some(i => i.k === k && i.st === 1);
  const holderOf = (G, k) => { const i = G.it.find(o => o.k === k && o.st === 1); return i ? byId(G, i.c) : null; };
  const conf = G => G.it.filter(i => i.st === 2);
  const codeTxt = G => { const c = G.plan.code; return (G.ck[0] ? c.slice(0, 2) : '··') + (G.ck[1] ? c.slice(2) : '··'); };
  const codeAll = G => G.ck[0] && G.ck[1];
  const lasersOn = G => G.plan.c === 'las' && !G.lz;

  // ======================= REGOLE =======================
  // cosa si puo' fare qui (pulsante grande): una cosa sola, la piu' importante
  function action(G, c) {
    if (!c.alive || c.esc) return null;
    const p = P(c), M = MP(), pl = G.plan, near = (x, y, r = OP_R) => Math.hypot(p.x - x, p.y - y) < r;
    if (c.jail) {
      const t = G.time - c.jt; if (G.cellO > G.time) return { k: 'wait', t: '🏃 La cella è aperta: esci!', on: false };
      if (t < EV_WAIT) return { k: 'wait', t: '⛓️ In cella… evasione tra ' + Math.ceil(EV_WAIT - t) + ' s', on: false };
      if ((c.evT || 0) > G.time) return { k: 'wait', t: '⛓️ Riprova tra ' + Math.ceil(c.evT - G.time) + ' s', on: false };
      return { k: 'ev', t: '🔓 Tenta l\'evasione', on: true };
    }
    if (c.op) return { k: 'wait', t: opTxt(G, c), on: false };
    // stordire da dietro: priorita' (la guardia si gira!)
    const gd = stunTarget(G, c); if (gd) return { k: 'stun', g: gd.id, t: '👊 Stordisci la guardia', on: true };
    // guardia a terra da frugare (se ha il badge)
    for (const g of G.gd) if (g.st === 'ko' && near(g.x, g.y, 1.4) && !G.sr.guard) { const it = G.it.find(i => i.s === 'guard' && i.st === 0); if (it && g.id === pl.gb) return { k: 'src', s: 'guard', t: '🔍 Fruga la guardia', on: true }; }
    // liberare i compagni dalla cella
    if (G.chars.some(o => o.jail) && near(M.cellOut[0], M.cellOut[1], 1.3) && !(G.cellO > G.time)) return { k: 'free', t: '🔓 Scassina la cella (fa rumore)', on: true };
    if (conf(G).length && nearSpot(G, c, 'conf')) return { k: 'conf', t: '📦 Riprendi la refurtiva', on: true };
    // furgone: fuga col diamante
    // porte dell'interrato
    for (const k in M.gates) { const gt = M.gates[k]; if (!near(gt.s[0], gt.s[1], 1.4)) continue; if (k !== pl.a) return { k: 'wait', t: '🚫 ' + cap(gt.n) + ': fuori servizio stanotte', on: false }; if (G.o1) break;
      const ik = ACC[k].it; return has(G, ik) && holderOf(G, ik) === c ? { k: 'acc', t: k === 'asc' ? '💳 Passa il badge' : k === 'sca' ? '🔑 Apri la porta' : '🔑 Sblocca il montacarichi', on: true } : { k: 'wait', t: '🔒 Serve ' + KIND[ik][0] + ' ' + KIND[ik][1], on: false }; }
    // porta del caveau
    const V = M.vdoor;
    if (!G.o2 && G.o1 && pl.b === 'dop') { for (const [sd, q] of [[0, V.kl], [1, V.kr]]) if (near(q[0], q[1], 0.9)) return has(G, 'kA') && has(G, 'kB') ? { k: 'turn', sd, t: '🗝️ Gira la chiave (insieme!)', on: true } : { k: 'wait', t: '🔒 Servono le due chiavi', on: false }; }
    if (!G.o2 && near(V.s[0] - 0.5, V.s[1], 1.6)) {
      if (pl.b === 'tas') return { k: 'kp', t: '🔢 Tastierino: digita il codice', on: true };
      if (pl.b === 'imp') return has(G, 'imp') && holderOf(G, 'imp') === c ? { k: 'prt', t: '🖐️ Appoggia l\'impronta', on: true } : { k: 'wait', t: '🔒 Serve l\'impronta del direttore', on: false };
      if (pl.b === 'dop') return { k: 'wait', t: '🗝️ Due serrature: una a sinistra e una a destra', on: false };
    }
    // teca
    const T = M.teca;
    if (G.o2 && !G.o3 && near(T.x + 0.5, T.y + 0.5, 1.6)) {
      if (pl.c === 'las' && !G.lz) return { k: 'wait', t: '🔴 Laser accesi: spegnili dal quadro elettrico', on: false };
      if (pl.c === 'pes' && !G.sw) return has(G, 'fake') && holderOf(G, 'fake') === c ? { k: 'swp', t: '💠 Scambia col diamante finto', on: true } : { k: 'wait', t: '⚖️ Sensore di peso: serve il diamante finto', on: false };
      if (pl.c === 'cmb' && !G.cb) return { k: 'cmb', t: '🎛️ Ascolta la combinazione (12 s)', on: true };
      return { k: 'take', t: '💎 Prendi il diamante!', on: true };
    }
    if (nearSpot(G, c, 'quadro')) return { k: 'quad', t: '⚡ Quadro elettrico', on: true };
    // frugare
    const s = srcAt(G, c); if (s) return { k: 'src', s, t: '🔍 Fruga: ' + spot(G, s).n, on: true };
    return null;
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const nearSpot = (G, c, k) => { const s = spot(G, k), p = P(c); return !!s && Math.hypot(p.x - s.x - 0.5, p.y - s.y - 0.5) < OP_R; };
  function srcAt(G, c) { let b = null, bd = OP_R; const p = P(c); for (const k of needSpots(G)) { const s = spot(G, k), d = Math.hypot(p.x - s.x - 0.5, p.y - s.y - 0.5); if (d < bd) { bd = d; b = k; } } return b; }
  // guardia da stordire: vicina, di spalle (non mi guarda), non all'inseguimento
  function stunTarget(G, c) {
    const p = P(c);
    for (const g of G.gd) {
      if (g.st === 'ko' || g.st === 'chase') continue; const d = Math.hypot(g.x - p.x, g.y - p.y); if (d > STUN_R) continue;
      let a = Math.atan2(p.y - g.y, p.x - g.x) - g.a; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) > 1.75) return g;
    }
    return null;
  }
  const OPN = { src: '🔍 Frugo', acc: '🔓 Apro', prt: '🖐️ Impronta', kp: '🔢 Codice', turn: '🗝️ Giro', swp: '💠 Scambio', cmb: '🎛️ Ascolto', take: '💎 Prendo', free: '🔓 Scassino', conf: '📦 Riprendo' };
  const OPD = { src: SRCH_T, acc: ACC_T, prt: PRT_T, kp: KP_T, turn: TURN_T, swp: SWAP_T, cmb: CMB_T, take: TAKE_T, free: FREE_T, conf: CONF_T };
  const opTxt = (G, c) => (OPN[c.op.k] || '…') + '… ' + Math.round(Math.min(1, (G.time - c.op.t0) / c.op.d) * 100) + '% (resta fermo!)';
  function doAct(G, c, a) {
    if (!c || !a || !c.alive || c.esc || G.phase !== 'play') return;
    if (a.k === 'ev') { tryEscape(G, c, a.ok); return; }
    if (c.jail) return;
    if (a.k === 'coin') { throwCoin(G, c, a.x, a.y); return; }
    if (a.k === 'quad') { quadro(G, c, a.o); return; }
    if (a.k === 'kpv') { keypad(G, c, a.v); return; }
    const cur = action(G, c); if (!cur || cur.k !== a.k || !cur.on) return;
    const p = P(c);
    if (a.k === 'stun') { const g = G.gd.find(o => o.id === cur.g); if (!g) return; GD.stun(G, g); c.ko = (c.ko || 0) + 1; GD.noise(G, g.x, g.y, 2.2); say(G, 'stun', { a: c.id, g: g.id }); return; }
    if (OPD[a.k]) c.op = { k: a.k, t0: G.time, d: OPD[a.k], x: p.x, y: p.y, s: cur.s, sd: cur.sd, nz: 0 };
  }
  // operazione finita
  function opDone(G, c) {
    const o = c.op; c.op = null; const pl = G.plan, M = MP();
    if (o.k === 'src') {
      if (G.sr[o.s]) return; G.sr[o.s] = 1; c.sc = (c.sc || 0) + 1;
      if (o.s === 'postit' || o.s === 'monit') { G.ck = [1, 1]; say(G, 'code', { a: c.id, s: o.s }); return; }
      if (o.s === 'agenda') { G.ck[0] = 1; say(G, 'code', { a: c.id, s: o.s }); return; }
      if (o.s === 'safe' && pl.b === 'tas' && pl.bc === 'split') { G.ck[1] = 1; say(G, 'code', { a: c.id, s: o.s }); return; }
      const it = G.it.find(i => i.s === o.s && i.st === 0);
      if (it) { it.st = 1; it.c = c.id; say(G, 'found', { a: c.id, it: it.k, s: o.s }); } else say(G, 'empty', { a: c.id, s: o.s });
    }
    else if (o.k === 'acc') { G.o1 = 1; useItem(G, ACC[pl.a].it); say(G, 'open1', { a: c.id }); }
    else if (o.k === 'prt') { G.o2 = 1; useItem(G, 'imp'); say(G, 'open2', { a: c.id }); }
    else if (o.k === 'kp') { if (codeAll(G)) { G.o2 = 1; say(G, 'open2', { a: c.id }); } else { GD.noise(G, M.vdoor.s[0], M.vdoor.s[1], 8); say(G, 'kpno', { a: c.id }); } }
    else if (o.k === 'turn') { G.tk[o.sd] = G.time; G.tkc[o.sd] = c.id; if (Math.abs(G.tk[0] - G.tk[1]) < TURN_WIN && G.tkc[0] !== G.tkc[1]) { G.o2 = 1; useItem(G, 'kA'); useItem(G, 'kB'); say(G, 'open2', { a: c.id }); } else say(G, 'turn1', { a: c.id }); }
    else if (o.k === 'swp') { G.sw = 1; useItem(G, 'fake'); grabDiam(G, c); }
    else if (o.k === 'cmb') { G.cb = 1; say(G, 'cmb', { a: c.id }); }
    else if (o.k === 'take') grabDiam(G, c);
    else if (o.k === 'free') { G.rescT = G.time + 20; G.cellO = G.time + CELL_OPEN; c.fr = (c.fr || 0) + 1; GD.noise(G, M.cellOut[0], M.cellOut[1], 7); for (const j of G.chars) if (j.jail) j.jail = 0; say(G, 'freed', { a: c.id }); }
    else if (o.k === 'conf') { for (const i of conf(G)) { i.st = 1; i.c = c.id; } say(G, 'conf', { a: c.id }); }
  }
  function useItem(G, k) { const i = G.it.find(o => o.k === k && o.st === 1); if (i) i.st = 3; }
  function grabDiam(G, c) { G.o3 = 1; const d = G.it.find(i => i.k === 'diam'); d.st = 1; d.c = c.id; G.alP = 1; c.dm = 1; say(G, 'diam', { a: c.id }); }
  function keypad(G, c, v) {
    const M = MP(); if (G.o2 || G.plan.b !== 'tas' || c.jail || dxy(c, M.vdoor.s[0] - 0.5, M.vdoor.s[1]) > 2) return;
    if (String(v) === G.plan.code) { G.o2 = 1; say(G, 'open2', { a: c.id }); }
    else { GD.noise(G, M.vdoor.s[0], M.vdoor.s[1], 8); say(G, 'kpno', { a: c.id }); }
  }
  function quadro(G, c, o) {
    if (c.jail || !nearSpot(G, c, 'quadro')) return; const M = MP(), q = M.SP.quadro;
    if (o === 'L') { if (G.plan.c !== 'las' || G.lz) return; G.lz = 1; say(G, 'laser', { a: c.id }); }
    else { if (!ALA[o] || (G.dk[o] || 0) + DARK_CD > G.time) return; G.dk[o] = G.time + DARK_T; c.lo = (c.lo || 0) + 1; say(G, 'dark', { a: c.id, o }); }
    G.qi = G.time + 4;   // tra 4 s una guardia va a controllare il quadro
  }
  function throwCoin(G, c, x, y) {
    if ((c.coins || 0) <= 0 || c.jail) return; const p = P(c); if (Math.hypot(x - p.x, y - p.y) > 7) return;
    c.coins--; G.cn.push({ x0: p.x, y0: p.y, x, y, t: G.time, id: ++G.cnN }); if (G.cn.length > 6) G.cn.shift();
    setTimeout(() => { const G2 = cq.g; if (G2 === G && G.phase === 'play') GD.noise(G, x, y, COIN_R); }, 500);
  }
  // presa: in cella, la refurtiva va nell'armadio delle confische
  function catchT(G, gd, c) {
    if (c.jail || c.esc) return;
    const M = MP(), n = G.chars.filter(o => o.jail).length, s = M.jail[n % M.jail.length];
    c.jail = 1; c.jt = G.time; c.jn = (c.jn || 0) + 1; c.op = null; c.path = []; c.ca = (c.ca || 0) + 1; c.evT = 0;
    let lost = 0; for (const i of G.it) if (i.st === 1 && i.c === c.id) { i.st = 2; i.c = -1; lost++; } if (c.dm) c.dm = 0;
    if (c.bot || c === G.me) { c.x = s[0]; c.y = s[1]; if (c === G.me) { cq.x = s[0]; cq.y = s[1]; G.myJn = c.jn; } }
    c.js = s; say(G, 'caught', { a: c.id, l: lost }); G.rescT = G.time + 15;   // il computer non corre subito a liberarlo (la guardia e' ancora li')
    if (window.__LOG) window.__LOG.push(Math.round(G.time) + 's ' + c.name + ' preso da ' + gd.id + ' in ' + (MP().rooms[roomAt(c.x, c.y)] || {}).n + ' meta ' + (c.goal ? c.goal.k + (c.goal.s || '') : '-') + ' inseg ' + Math.round(G.time - (gd.cs0 || 0)) + 's');
    if (!free(G).length) MODE.finish(G, 'jail');
  }
  function tryEscape(G, c, ok) {
    if (!c.jail || G.time - c.jt < EV_WAIT || (c.evT || 0) > G.time || G.cellO > G.time) return;
    c.evT = G.time + EV_CD;
    if (ok) { G.cellO = G.time + CELL_OPEN; for (const j of G.chars) if (j.jail) j.jail = 0; c.ev = (c.ev || 0) + 1; say(G, 'evok', { a: c.id }); }
    else { G.alE = Math.max(G.alE || 0, G.time + ALERT_T); c.evf = (c.evf || 0) + 1; GD.noise(G, MP().cellOut[0], MP().cellOut[1], 9); say(G, 'evno', { a: c.id }); }
  }

  // cronaca: l'host scrive (G.lg), ognuno la racconta dal suo punto di vista
  function say(G, k, o) { const e = Object.assign({ n: ++G.lgN, k }, o); G.lg.push(e); if (G.lg.length > 14) G.lg.shift(); show(G, e); }
  function show(G, e) {
    const me = G.me, A = byId(G, e.a), an = A ? '<b>' + esc(A.name) + '</b>' : 'Qualcuno', mine = A === me; let t = '';
    const sn = s => s === 'guard' ? 'la guardia' : spot(G, s) ? spot(G, s).n : s;
    if (e.k === 'found') t = foundTxt(G, e, mine, an);
    else if (e.k === 'empty') { if (mine) { t = '🤷 Niente qui (' + sn(e.s) + ').'; beep(300, 0.1, 0.03); } }
    else if (e.k === 'code') { t = '🔢 ' + (mine ? 'Codice' : an + ': codice') + (e.s === 'agenda' ? ' (prime due cifre)' : e.s === 'safe' ? ' (ultime due cifre)' : '') + ' sulla lavagna: <b>' + codeTxt(G) + '</b>'; beep(700, 0.08, 0.04); beep(940, 0.12, 0.04, 0.09); G.lvT = performance.now(); }
    else if (e.k === 'open1') { t = '🔓 ' + an + ' ha aperto ' + MP().gates[G.plan.a].n + ': si scende all\'interrato!'; beep(523, 0.1, 0.05); beep(784, 0.18, 0.05, 0.12); G.lvT = performance.now(); }
    else if (e.k === 'open2') { t = '🚪 La porta del caveau si apre! (' + an + ')'; for (let i = 0; i < 3; i++) beep(220 + i * 110, 0.2, 0.05, i * 0.18, 'square'); G.lvT = performance.now(); }
    else if (e.k === 'kpno') { t = mine ? '❌ Codice sbagliato! Il tastierino ha suonato: arriva qualcuno!' : '❌ Codice sbagliato al tastierino: rumore!'; beep(300, 0.15, 0.05, 0, 'square'); beep(300, 0.15, 0.05, 0.2, 'square'); }
    else if (e.k === 'turn1') { if (mine) t = '🗝️ Da solo non gira: le due chiavi vanno girate INSIEME, in due!'; }
    else if (e.k === 'cmb') { t = '🎛️ Combinazione trovata: la teca è aperta!'; beep(880, 0.08, 0.04); }
    else if (e.k === 'laser') { t = '⚡ ' + an + ' ha spento i laser della teca! Una guardia andrà a controllare il quadro…'; beep(200, 0.3, 0.05, 0, 'sawtooth'); G.lvT = performance.now(); }
    else if (e.k === 'dark') { t = '💡 ' + an + ' ha spento le luci: ' + ALA[e.o] + ' al buio per ' + DARK_T + ' s.'; thud(0.6, 90); }
    else if (e.k === 'diam') { t = mine ? '💎 HAI IL DIAMANTE! Allarme silenzioso: le guardie sono in ALLERTA. Corri al furgone!' : '💎 ' + an + ' ha il diamante! Le guardie sono in allerta: tutti al furgone!'; beep(784, 0.12, 0.05); beep(988, 0.12, 0.05, 0.12); beep(1318, 0.3, 0.05, 0.24); G.lvT = performance.now(); }
    else if (e.k === 'stun') { if (mine) t = '👊 Guardia stordita per ' + GD.KO_T + ' s. Se un\'altra la trova, scatta l\'allerta!'; thud(0.7, 140); }
    else if (e.k === 'kofound') { t = '🚨 Una guardia ha trovato il collega stordito: ALLERTA per ' + ALERT_T + ' s!'; for (let i = 0; i < 3; i++) beep(i % 2 ? 900 : 700, 0.15, 0.03, i * 0.18); }
    else if (e.k === 'cam') { if (mine) t = '📹 Una telecamera ti ha visto! Arriva una guardia…'; else if (G.me.alive && !G.me.jail) t = '📹 Una telecamera ha visto ' + an + '!'; beep(1200, 0.06, 0.03); beep(1200, 0.06, 0.03, 0.12); }
    else if (e.k === 'chase') { if (mine) { t = '❗ Ti hanno visto! Scappa e fatti perdere di vista!'; cq.hurt = performance.now(); } beep(520, 0.1, 0.05, 0, 'square'); beep(780, 0.15, 0.05, 0.1, 'square'); }
    else if (e.k === 'caught') { t = mine ? '⛓️ Preso! Sei in cella' + (e.l ? ': la refurtiva è nell\'armadio delle confische' : '') + '. Guarda dalla finestrella e avvisa i compagni.' : '⛓️ ' + an + ' è stato preso' + (e.l ? ' (la refurtiva è nell\'armadio delle confische, nella sala della sicurezza)' : '') + '!'; for (let i = 0; i < 4; i++) beep(i % 2 ? 600 : 800, 0.16, 0.03, i * 0.2); }
    else if (e.k === 'freed') { t = '🔓 ' + an + ' ha aperto la cella! Uscite in fretta: ha fatto rumore!'; beep(523, 0.1, 0.05); beep(659, 0.15, 0.05, 0.1); }
    else if (e.k === 'evok') { t = '🔓 ' + an + ' è evaso dalla cella!'; beep(523, 0.1, 0.05); beep(784, 0.15, 0.05, 0.1); }
    else if (e.k === 'evno') { t = '🚨 ' + an + ' ha provato a evadere ma ha fatto scattare l\'ALLERTA: guardie più attente per ' + ALERT_T + ' s!'; for (let i = 0; i < 4; i++) beep(i % 2 ? 950 : 750, 0.14, 0.035, i * 0.16, 'square'); }
    else if (e.k === 'conf') { t = '📦 ' + an + ' ha ripreso la refurtiva dall\'armadio delle confische!'; beep(660, 0.1, 0.04); }
    else if (e.k === 'esc') { t = '🚐 ' + an + ' è sul furgone col diamante: COLPO RIUSCITO!'; }
    if (t) cqToast(t);
  }
  function foundTxt(G, e, mine, an) {
    const K = KIND[e.it] || ['✅', 'qualcosa'], sn = e.s === 'guard' ? 'addosso alla guardia' : spot(G, e.s) ? spot(G, e.s).n : '';
    beep(660, 0.1, 0.04); beep(990, 0.14, 0.04, 0.1); G.lvT = performance.now();
    return (mine ? '✅ Trovato ' : '✅ ' + an + ' ha trovato ') + K[0] + ' ' + K[1] + (sn ? ' (' + sn + ')' : '') + '!';
  }

  // ======================= LADRI DEL COMPUTER =======================
  function go(G, c, x, y) {
    let tx = x, ty = y; if (!cqCellFree(Math.floor(tx), Math.floor(ty))) { const q = cqSpot(Math.floor(tx), Math.floor(ty)); tx = q.x; ty = q.y; }
    c.path = cqPath(c.x, c.y, tx, ty); c.gx = tx; c.gy = ty; return c.path.length > 0 || Math.hypot(c.x - tx, c.y - ty) < 0.7;
  }
  const rangeAt = (G, x, y) => darkAt(G, x, y) ? DARK_R : LIT_R;
  // una guardia mi vedrebbe in x, y? (con un po' di margine)
  function danger(G, x, y, m = 1) { for (const g of G.gd) { if (g.st === 'ko' || Math.hypot(g.x - x, g.y - y) > 10) continue; if (GD.sees(g, x, y, rangeAt(G, g.x, g.y) * (alertOn(G) ? 1.22 : 1) + m) > 0) return g; } return null; }
  // fuga: lontano da chi mi insegue, fuori dalla sua vista, e senza finire addosso alle altre guardie (strada e arrivo)
  function flee(G, c, th) {
    let best = null, bs = -1e9; const others = G.gd.filter(g => g !== th && g.st !== 'ko' && Math.hypot(g.x - c.x, g.y - c.y) < 14);
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * 7, r = 4 + Math.random() * 6, x = Math.floor(c.x + Math.cos(a) * r), y = Math.floor(c.y + Math.sin(a) * r); if (!cqCellFree(x, y)) continue;
      const p = cqPath(c.x, c.y, x + 0.5, y + 0.5); if (!p.length || p.length > 14) continue;
      const f = p[Math.min(2, p.length - 1)];
      let s = Math.hypot(x - th.x, y - th.y) * 1.5 + 3 * (Math.hypot(f[0] - th.x, f[1] - th.y) - Math.hypot(c.x - th.x, c.y - th.y)) + (GD.los(th.x, th.y, x + 0.5, y + 0.5) ? 0 : 14) + (GD.los(th.x, th.y, f[0], f[1]) ? 0 : 6);
      for (const g of others) { for (let k = 0; k < p.length; k += 2) { const d = Math.hypot(p[k][0] - g.x, p[k][1] - g.y); if (d < 3) s -= (3 - d) * 6; } if (GD.sees(g, x + 0.5, y + 0.5, 7) > 0) s -= 10; }
      if (s > bs) { bs = s; best = p; }
    }
    if (best) c.path = best.slice(0, 10);
  }
  // obiettivo del computer: dove andare e cosa fare li'
  function botGoal(G, c) {
    const M = MP(), pl = G.plan, mine = k => G.it.some(i => i.k === k && i.st === 1 && i.c === c.id);
    if (c.dm) return { x: M.van.x, y: M.van.y, k: 'van' };
    const jailed = G.chars.filter(o => o.jail);
    if (jailed.length && !(G.cellO > G.time) && G.time > (G.rescT || 0)) { const res = G.chars.filter(o => o.bot && !o.jail && o.goal && o.goal.k === 'free'); if (!res.length || res[0] === c) return { x: M.cellOut[0], y: M.cellOut[1], k: 'free' }; }
    if (G.cellO > G.time && c.jail === 0 && inRoom(c.x, c.y, M.cellRoom)) return { x: 50.5, y: 9.5, k: 'out' };
    if (conf(G).length && G.chars.filter(o => o.bot && o.goal && o.goal.k === 'conf' && o !== c).length === 0) { const s = M.SP.conf; return { x: s.x + 0.5, y: s.y + 0.5, k: 'conf' }; }
    // oggetti miei da usare
    if (!G.o1 && mine(ACC[pl.a].it)) { const gt = M.gates[pl.a]; return { x: gt.s[0], y: gt.s[1], k: 'acc' }; }
    if (G.o1 && !G.o2) {
      if (pl.b === 'imp' && mine('imp')) return { x: M.vdoor.s[0] - 0.5, y: M.vdoor.s[1], k: 'prt' };
      if (pl.b === 'tas' && codeAll(G)) return { x: M.vdoor.s[0] - 0.5, y: M.vdoor.s[1], k: 'kp' };
      if (pl.b === 'dop' && has(G, 'kA') && has(G, 'kB')) { const L0 = G.chars.find(o => o !== c && ((o.goal && o.goal.k === 'turn' && o.goal.sd === 0) || (!o.bot && Math.hypot(o.x - M.vdoor.kl[0], o.y - M.vdoor.kl[1]) < 1.2))); const sd = L0 ? 1 : 0, q = sd ? M.vdoor.kr : M.vdoor.kl; return { x: q[0], y: q[1], k: 'turn', sd }; }
    }
    if (G.o2 && !G.o3) {
      if (pl.c === 'las' && !G.lz) { const s = M.SP.quadro; return { x: s.x + 0.5, y: s.y + 0.5, k: 'quadL' }; }
      if (pl.c === 'pes' && !G.sw) { if (mine('fake')) return { x: M.teca.x + 0.5, y: M.teca.y + 1.5, k: 'swp' }; }
      else return { x: M.teca.x + 0.5, y: M.teca.y + 1.5, k: pl.c === 'cmb' && !G.cb ? 'cmb' : 'take' };
    }
    // da frugare: il posto piu' vicino che nessun altro computer sta gia' frugando
    const taken = new Set(G.chars.filter(o => o !== c && o.goal && o.goal.k === 'src').map(o => o.goal.s));
    let best = null, bd = 1e9;
    for (const k of needSpots(G)) {
      if (taken.has(k)) continue; if ((k === 'kLav' || k === 'kCan') && !G.o1) continue;   // l'interrato si raggiunge solo dopo il primo sbarramento
      const s = spot(G, k), d = Math.hypot(s.x - c.x, s.y - c.y) + Math.random() * 6; if (d < bd) { bd = d; best = { x: s.x + 0.5, y: s.y + 0.5, k: 'src', s: k }; }
    }
    if (best) return best;
    // badge addosso a una guardia: le si arriva alle spalle
    const bi = G.it.find(i => i.s === 'guard' && i.st === 0);
    if (bi && !G.o1 && pl.gb >= 0) { const g = G.gd[pl.gb]; if (g) return g.st === 'ko' ? { x: g.x, y: g.y, k: 'src', s: 'guard' } : { x: g.x - Math.cos(g.a) * 1.1, y: g.y - Math.sin(g.a) * 1.1, k: 'stalk' }; }
    // niente da fare: aiutare (guardare la porta del caveau o girare per l'hotel)
    if (G.o1 && !G.o2 && pl.b === 'dop') { const q = M.vdoor.kr; return { x: q[0], y: q[1], k: 'turn', sd: 1 }; }
    return null;
  }
  function botT(G, c, dt) {
    const M = MP();
    if (c.jail) {
      c.path = []; c.walk = 0;
      if (G.time - c.jt > EV_WAIT && !((c.evT || 0) > G.time) && !(G.cellO > G.time) && !G.chars.some(o => !o.jail && o.goal && o.goal.k === 'free' && Math.hypot(o.x - M.cellOut[0], o.y - M.cellOut[1]) < 12)) { if (Math.random() < 0.02) tryEscape(G, c, Math.random() < 0.4); }
      return;
    }
    if ((c.think -= dt) <= 0) {
      c.think = 0.35 + Math.random() * 0.2;
      const chaser = G.gd.find(g => g.st === 'chase' && g.tgt === c.id), sus = G.gd.find(g => (g.st === 'sus' || g.st === 'inv') && g.st !== 'ko' && Math.hypot((g.st === 'sus' ? g.lx : g.ix) - c.x, (g.st === 'sus' ? g.ly : g.iy) - c.y) < 3 && Math.hypot(g.x - c.x, g.y - c.y) < 9);
      if (chaser || sus) { if (!((c.scare || 0) > G.time) && c.goal) c.g0 = c.goal.k + (c.goal.s || '') + '@' + (MP().rooms[roomAt(c.x, c.y)] || {}).n; c.scare = G.time + 4 + Math.random() * 3; }
      if (sus && !chaser && !c.op) { c.goal = { k: 'flee' }; if (!c.path.length || Math.random() < 0.3) flee(G, c, sus); }
      else if (chaser) { c.goal = { k: 'flee' }; if (!c.path.length || Math.random() < 0.4) flee(G, c, chaser); if ((c.coins || 0) > 0 && Math.random() < 0.05) { const a = Math.random() * 7; doAct(G, c, { k: 'coin', x: c.x + Math.cos(a) * 4, y: c.y + Math.sin(a) * 4 }); } }
      else {
        // stordire una guardia di spalle (piu' volentieri se ha il badge o sta sul percorso)
        const st = stunTarget(G, c); if (st && (Math.random() < 0.55 || st.id === G.plan.gb)) { doAct(G, c, { k: 'stun' }); return; }
        // spaventato: resto nascosto (se nessuno mi vede) finche' passa
        if ((c.scare || 0) > G.time) { const g = danger(G, c.x, c.y, 1.5); c.goal = { k: 'hide' }; if (g) flee(G, c, g); else if (c.path.length > 3) c.path = c.path.slice(0, 3); return; }
        const gl = botGoal(G, c); c.goal = gl;
        if (gl) {
          const d = Math.hypot(c.x - gl.x, c.y - gl.y), a = action(G, c);
          if (gl.k === 'quadL' && nearSpot(G, c, 'quadro')) { quadro(G, c, 'L'); c.path = []; }
          else if (a && a.on && ((gl.k === 'src' && a.k === 'src' && a.s === gl.s) || gl.k === a.k || (gl.k === 'free' && a.k === 'free'))) { const g = danger(G, c.x, c.y, a.k === 'free' ? 4 : 2.5); if (g) { c.hold = G.time + 1 + Math.random() * 2; } else { doAct(G, c, { k: a.k }); c.path = []; } }
          else if (gl.k === 'van' && d < 1) c.path = [];
          else if (d > 0.6 && (!c.path.length || Math.hypot(c.gx - gl.x, c.gy - gl.y) > 0.8 || Math.random() < 0.06)) go(G, c, gl.x, gl.y);
        } else { const g = danger(G, c.x, c.y, 1); if (g) flee(G, c, g); }
      }
    }
    // durante un'operazione: se una guardia sta per vedermi, lascio perdere e scappo
    if (c.op) { c.walk = 0; const g = danger(G, c.x, c.y, 1.6); if (g && c.op.k !== 'take' && c.op.k !== 'swp') { c.op = null; c.hold = 0; flee(G, c, g); } return; }
    // furtivo: se il prossimo passo finisce in vista di una guardia, aspetto e mi tiro indietro
    if (c.goal && c.goal.k !== 'flee' && c.goal.k !== 'van' && c.goal.k !== 'hide') {
      if ((c.hold || 0) > G.time) { const g = danger(G, c.x, c.y, 0.8); if (g) flee(G, c, g); else { c.walk = 0; return; } }
      else { const p = c.path[0], q = c.path[2] || p, r = c.path[4] || q; const g = p && (danger(G, q[0], q[1], 1.2) || danger(G, p[0], p[1], 1.2) || danger(G, r[0], r[1], 0.6)); if (g && g.st !== 'chase') { c.hold = G.time + 0.8 + Math.random() * 1.6; c.path = []; c.walk = 0; return; } }
    }
    cqModeStep(c, dt, (c.goal && c.goal.k === 'flee' ? 1 : 0.9) * MODE.speed(c));
  }

  // ======================= IL GIOCO NEL MOTORE =======================
  function setup(G) {
    G.lg = []; G.lgN = 0; G.sr = {}; G.ck = [0, 0]; G.o1 = 0; G.o2 = 0; G.o3 = 0; G.lz = 0; G.sw = 0; G.cb = 0; G.tk = [-9, -9]; G.tkc = [-1, -1]; G.alE = 0; G.alP = 0;
    G.dk = { A: 0, U: 0, T: 0, I: 0 }; G.cellO = 0; G.qi = 0; G.cn = []; G.cnN = 0; G.cs = MP().hcams.map(() => 0); G.ccd = MP().hcams.map(() => 0); G.left = G.opt.time || 600; G.esc = null; G.myJn = 0;
  }
  // porte: chiuse/aperte su ogni telefono (cqSolid) secondo lo stato
  function syncDoors(G) {
    const M = MP(), want = { sca: G.o1 && G.plan.a === 'sca', asc: G.o1 && G.plan.a === 'asc', mon: G.o1 && G.plan.a === 'mon', vault: !!G.o2, cell: G.cellO > G.time };
    G.dD = G.dD || {};
    for (const k in want) {
      const v = want[k] ? 1 : 0; if (G.dD[k] === v) continue; G.dD[k] = v;
      const cells = k === 'vault' ? M.vdoor.c : k === 'cell' ? [[55, 3], [55, 4]] : M.gates[k].c, t = k === 'vault' ? 'bdoor' : k === 'cell' ? 'cdoor' : k === 'sca' ? 'fdoor' : k === 'asc' ? 'lift' : 'fgate';
      cells.forEach(([x, y], i) => { cqSolid[y][x] = v ? null : { prop: t, o: k === 'cell' ? { v: 1 } : k === 'vault' && i === 0 ? { part: 1 } : {} }; cqBgCell(x, y, 1); });
      if (!v && !cqFree(cq.x, cq.y)) { const q = cqSpot(Math.floor(cq.x), Math.floor(cq.y)); cq.x = q.x; cq.y = q.y; }
      const d = Math.hypot(cells[0][0] - cq.x, cells[0][1] - cq.y); if (d < 14 && G.time > 0.5) { thud(0.6 * (1 - d / 14), k === 'vault' ? 70 : 140); }
    }
  }
  const scrA = a => { const c = Math.cos(a), s = Math.sin(a); return Math.atan2((c + s) / 2, c - s); };
  const env = G => ({ thieves: free(G), pos: P, vis: c => c.bot ? 0.65 : 1,   // i compagni del computer si notano un po' meno (come negli altri giochi furtivi cooperativi)
  range: (x, y) => rangeAt(G, x, y), alert: alertOn(G), k: G.opt.dif === 'f' ? 0.8 : G.opt.dif === 'd' ? 1.25 : 1, speed: 1,
    onCatch: (gd, c) => catchT(G, gd, c), onKo: () => { G.alE = Math.max(G.alE || 0, G.time + ALERT_T); say(G, 'kofound', {}); },
    onChase: (gd, c) => { gd.cs0 = G.time; if (window.__LOG) window.__LOG.push(Math.round(G.time) + 's VISTO ' + c.name + ' da ' + gd.id + ' d=' + Math.hypot(gd.x - P(c).x, gd.y - P(c).y).toFixed(1) + ' in ' + (MP().rooms[roomAt(P(c).x, P(c).y)] || {}).n + ' meta ' + (c.goal ? c.goal.k : '-') + ' (prima: ' + c.g0 + ')' + ' guardia era ' + gd.st0 + ' sosp ' + (G.time - (gd.sT || 0)).toFixed(1) + 's' + (c.op ? ' OP ' + c.op.k : '') + ((c.hold || 0) > G.time ? ' FERMO' : '') + ((c.scare || 0) > G.time ? ' PAURA' : '') + (darkAt(G, P(c).x, P(c).y) ? ' buio' : '') + (alertOn(G) ? ' ALLERTA' : '')); GD.radio(G, gd); say(G, 'chase', { a: c.id }); } });
  const MODE = CQ_MODES.colpo = {
    n: 'Colpo all\'hotel',
    desc: '💎 Tutti ladri insieme: rubate il diamante nel caveau del Grand Hotel senza farvi prendere dalle guardie. Il colpo cambia ogni volta.',
    maps: [['grandhotel', 'Grand Hotel di notte']],
    def: { time: 600, dif: 'n', map: 'grandhotel', n: 4, fill: true },
    opts: o => `<div class="row"><div class="lbl">Guardie</div>${seg('dif', [['f', 'Facili'], ['n', 'Normali'], ['d', 'Difficili']], o.dif || 'n')}</div>
      <div class="row"><div class="lbl">Durata</div>${seg('time', [[480, '8:00'], [600, '10:00'], [900, '15:00']], o.time || 600)}</div>`,
    read: d => ({ dif: d.get('dif') || 'n', time: +d.get('time') || 600 }),
    start(G) {
      cq.mapDirty = true; cqUseMap('grandhotel');   // porte di nuovo chiuse (la mappa fissa resta in memoria tra una partita e l'altra)
      const M = MP(), R = M.routes, dif = G.opt.dif || 'n';
      const list = ['cella', 'grande', 'hall', 'interrato'].concat(dif !== 'f' ? ['camere', 'uffici'] : []).concat(dif === 'd' ? ['cucine', 'negozio'] : []);
      if (G.chars.length >= 6 && dif !== 'd') list.push(dif === 'f' ? 'camere' : 'cucine');
      G.gd = GD.make(list.map(k => R[k])); G.gd.forEach(g => { if (!g.post) { g.ri = Math.floor(Math.random() * g.route.length); const w = g.route[g.ri]; g.x = w[0]; g.y = w[1]; g.a = w[3] || 0; } });
      setup(G); makePlan(G);
      const ring = M.ring.slice();
      G.chars.forEach((c, i) => { const [x, y] = ring[i % ring.length]; Object.assign(c, { x: x + 0.5, y: y + 0.5, jail: 0, jt: 0, jn: 0, op: null, coins: COINS, path: [], dm: 0, esc: 0, sc: 0, ko: 0, fr: 0, ca: 0, ev: 0, evf: 0, lo: 0, t: 0 }); });
      cq.x = G.me.x; cq.y = G.me.y;
    },
    gstart(G) { cq.mapDirty = true; cqUseMap('grandhotel'); setup(G); G.gd = []; G.plan = null; G.it = []; },
    intro: G => G.plan ? '💎 Il colpo di stanotte: guarda la lavagna in alto a sinistra!' : '💎 Colpo all\'hotel',
    speed(c) {
      const G = cq.g; if (!G || !G.plan) return 1; if (c.op || c.esc) return 0;
      return c.dm ? 0.94 : 1;
    },
    big(G) {
      const me = G.me; if (!G.plan) return '';
      if (G.esc) return '🚐 Colpo riuscito!';
      if (me.jail) return G.cellO > G.time ? '🏃 La cella è aperta: esci!' : '';
      if (me.op) return opTxt(G, me);
      const ch = G.gd.find(g => g.st === 'chase' && g.tgt === me.id); if (ch) return '❗ Ti inseguono: fatti perdere di vista!';
      return '';
    },
    hud(G) {
      const me = G.me; if (!G.plan) return '💎 Colpo all\'hotel';
      return `<b style="color:${TC}">🦹 Ladri</b> · ⏳ ${mmss(Math.max(0, G.left))} · 🪙 ${me.coins || 0}` + (alertOn(G) ? ' · <b style="color:#ff6a5a">🚨 ALLERTA</b>' : '') + (G.chars.some(c => c.jail) ? ' · ⛓️ ' + G.chars.filter(c => c.jail).length : '');
    },
    nameCol: c => c.jail ? '#9aa0a8' : TC,
    // le guardie (non sono personaggi: si disegnano come comparse) quando le vedo
    extras(G) {
      if (!G.gd) return [];
      const out = [], me = G.me, M = MP();
      for (const g of G.gd) {
        if (!guardSeen(G, g)) continue;
        if (!g.__dr) { const gg = g; g.__dr = (cx, X, Y, TW) => GD.draw(cx, X, Y, TW, gg.walk, Math.cos(gg.a) - Math.sin(gg.a) >= 0 ? 1 : -1, gg.st === 'ko'); g.__dr.top = 2.1; }
        out.push({ x: g.x, y: g.y, L: null, w: g.walk, f: 1, name: null, all: true, dr: g.__dr });
      }
      void me; void M; return out;
    },
    btn(G) { if (!G.plan) return null; const a = action(G, G.me); return a ? { t: a.t, on: a.on } : null; },
    act(G) {
      const me = G.me, a = action(G, me); if (!a || !a.on) return;
      if (a.k === 'kp') { keypadUI(G); return; }
      if (a.k === 'quad') { quadroUI(G); return; }
      if (a.k === 'ev') { pickUI(G); return; }
      if (G.guest) cqNetSend({ k: 'a', a: a.k }); else doAct(G, me, { k: a.k });
    },
    ev(G, c, o) { if (o && o.k === 'a') doAct(G, c, { k: o.a, x: o.x, y: o.y, o: o.o, v: o.v, ok: o.ok }); },
    voice: (G, c) => c.alive ? 1 : 0,   // auricolari: i ladri si sentono sempre (anche chi e' in cella)
    local(G, dt) {
      if (!G.plan) return;
      const me = G.me;
      syncDoors(G);
      if (!G.brief && !G.me.bot) { G.brief = 1; planUI(G); }   // all'inizio: il piano del colpo con gli indizi
      if (G.guest) GD.smooth(G, dt);
      // in cella: il mio personaggio ci finisce dentro sul mio telefono
      if (me.jail && me.jn !== G.myJn && me.js) { G.myJn = me.jn; cq.x = me.js[0]; cq.y = me.js[1]; cqCloseTask(); }
      // battito del cuore se una guardia mi sospetta o mi insegue
      G.hb = 0;
      for (const g of G.gd) { if (g.st === 'chase' && g.tgt === me.id) G.hb = 1; else if (g.st === 'sus' && Math.hypot(g.lx - cq.x, g.ly - cq.y) < 2.5) G.hb = Math.max(G.hb, 0.4 + 0.6 * g.sus); }
      if (G.hb > 0 && (G.hbT = (G.hbT || 0) - dt) <= 0) { G.hbT = 0.35 + 0.4 * (1 - G.hb); G.hbP = performance.now(); const v = 0.05 + 0.1 * G.hb; beep(58, 0.11, v, 0, 'sine'); beep(50, 0.12, v * 0.8, 0.15, 'sine'); }
      // rumore durante la combinazione (click che si sentono)
      for (const c of G.chars) if (c.op && c.op.k === 'cmb' && Math.random() < dt * 2) { const d = Math.hypot(c.x - cq.x, c.y - cq.y); if (d < 10) beep(1800 + Math.random() * 400, 0.02, 0.02 * (1 - d / 10)); }
      // passi delle guardie vicine
      for (const g of G.gd) { if (g.st === 'ko' || !g.walk) continue; const d = Math.hypot(g.x - cq.x, g.y - cq.y); if (d < 9 && (g.stT = (g.stT || 0) - dt) <= 0) { g.stT = g.st === 'chase' ? 0.26 : 0.5; thud(0.18 * (1 - d / 9), 300 + g.id * 20); } }
    },
    tick(G, dt) {
      G.left -= dt;
      const M = MP(), E = env(G);
      GD.tick(G, dt, E);
      // telecamere: chi resta nel cono per 0,7 s fa venire la guardia piu' vicina
      M.hcams.forEach((cm, i) => {
        if (darkAt(G, cm.x, cm.y) || G.ccd[i] > G.time) { G.cs[i] = 0; return; }
        const seen = free(G).find(c => GD.camSees(G, cm, P(c).x, P(c).y));
        if (!seen) { G.cs[i] = Math.max(0, G.cs[i] - dt); return; }
        G.cs[i] += dt; if (G.cs[i] < 0.7) return;
        G.cs[i] = 0; G.ccd[i] = G.time + 6; const p = P(seen);
        let b = null, bd = 1e9; for (const g of G.gd) { if (g.st === 'ko' || g.st === 'chase' || g.post) continue; const d = Math.hypot(g.x - p.x, g.y - p.y); if (d < bd) { bd = d; b = g; } }
        if (b) GD.investigate(b, p.x, p.y); say(G, 'cam', { a: seen.id });
      });
      // quadro elettrico toccato: una guardia va a controllare
      if (G.qi && G.time >= G.qi) { G.qi = 0; const q = M.SP.quadro; let b = null, bd = 1e9; for (const g of G.gd) { if (g.st === 'ko' || g.st === 'chase') continue; const d = Math.hypot(g.x - q.x, g.y - q.y); if (d < bd) { bd = d; b = g; } } if (b) GD.investigate(b, q.x + 0.5, q.y + 1.5); }
      // operazioni in corso: ci si deve stare fermi
      for (const c of G.chars) {
        if (!c.op) continue; const p = P(c);
        if (c.jail || Math.hypot(p.x - c.op.x, p.y - c.op.y) > 0.5) { c.op = null; continue; }
        if (c.op.k === 'cmb' && G.time - c.op.t0 > (c.op.nz + 1) * 3) { c.op.nz++; GD.noise(G, p.x, p.y, 6); }
        if (G.time - c.op.t0 >= c.op.d) opDone(G, c);
      }
      // la cella aperta si richiude; chi e' ancora dentro resta prigioniero
      if (G.cellO && G.time >= G.cellO && G.cellO > 0) { G.cellO = 0; for (const c of G.chars) if (!c.jail && !c.esc && inRoom(P(c).x, P(c).y, M.cellRoom)) { c.jail = 1; c.jt = G.time; } }
      // fuga col diamante (chi ce l'ha in tasca: anche dopo averlo ripreso dall'armadio delle confische)
      { const di = G.it.find(i => i.k === 'diam'); for (const c of G.chars) c.dm = di && di.st === 1 && di.c === c.id ? 1 : 0; }
      const dh = G.chars.find(c => c.dm && !c.jail);
      if (dh && !G.esc && dxy(dh, M.van.x, M.van.y) < VAN_R) { G.esc = { id: dh.id, at: G.time + 1.5 }; dh.esc = 1; say(G, 'esc', { a: dh.id }); }
      if (G.esc && G.time >= G.esc.at) { MODE.finish(G, 'win'); return; }
      // computer
      for (const c of G.chars) { if (!c.bot || !c.alive || c.esc) continue; botT(G, c, dt); }
      if (G.left <= 0) MODE.finish(G, 'time');
    },
    finish(G, why) {
      const name = c => c.name + (c === G.me ? ' (tu)' : '');
      const line = c => [name(c), '— ' + [c.dm || (G.esc && G.esc.id === c.id) ? '💎 ha portato il diamante' : '', c.sc ? '🔍 ' + c.sc : '', c.ko ? '👊 ' + c.ko : '', c.fr ? '🔓 ' + c.fr + ' liberati' : '', c.ca ? '⛓️ preso ' + c.ca + (c.ca > 1 ? ' volte' : ' volta') : ''].filter(Boolean).join(' · ')];
      const rank = G.chars.slice().sort((a, b) => ((b.sc || 0) + (b.fr || 0) * 2 + (b.ko || 0) - (b.ca || 0)) - ((a.sc || 0) + (a.fr || 0) * 2 + (a.ko || 0) - (a.ca || 0))).map(line);
      if (why === 'win') cqModeEnd({ t: '💎 Colpo riuscito!', why: 'Il diamante è sul furgone' + (G.chars.some(c => c.jail) ? ' (qualcuno è rimasto in cella…)' : '') + '.' + funny(G, 1), win: G.chars.map(c => c.id), rank });
      else cqModeEnd({ t: '🚔 Colpo fallito', why: (why === 'jail' ? 'Tutti in cella: le guardie festeggiano.' : 'Tempo scaduto: sta arrivando la polizia.') + funny(G, 0), win: [], rank });
    },
    csnap: c => { const G = cq.g; return [c.jail ? 1 : 0, Math.round((G.time - (c.jt || 0)) * 10) / 10, c.op ? Object.keys(OPD).indexOf(c.op.k) : -1, c.op ? Math.round((G.time - c.op.t0) * 10) / 10 : 0, c.coins || 0, c.jn || 0, c.js || 0, c.dm ? 1 : 0, c.esc ? 1 : 0, Math.max(0, Math.round(((c.evT || 0) - G.time) * 10) / 10), [c.sc || 0, c.ko || 0, c.fr || 0, c.ca || 0, c.ev || 0, c.evf || 0, c.lo || 0]]; },
    capply(G, c, a) {
      c.jail = a[0]; c.jt = G.time - a[1]; const k = Object.keys(OPD)[a[2]];
      c.op = k ? { k, t0: G.time - a[3], d: OPD[k], x: c === G.me ? cq.x : c.x, y: c === G.me ? cq.y : c.y } : null;
      c.coins = a[4]; c.jn = a[5]; c.js = a[6] || null; c.dm = a[7]; c.esc = a[8]; c.evT = a[9] > 0 ? G.time + a[9] : 0; [c.sc, c.ko, c.fr, c.ca, c.ev, c.evf, c.lo] = a[10];
    },
    snap(G) {
      const r = v => Math.round(v * 10) / 10;
      return { pl: G.plan, gd: GD.snap(G), it: G.it.map(i => [i.st, i.c, i.s]), sr: Object.keys(G.sr), ck: G.ck, o: [G.o1, G.o2, G.o3, G.lz, G.sw, G.cb], left: r(G.left), al: [r(Math.max(0, G.alE - G.time)), G.alP],
        dk: Object.fromEntries(Object.entries(G.dk).map(([k, v]) => [k, r(Math.max(0, v - G.time))])), co: r(Math.max(0, G.cellO - G.time)), cn: G.cn.map(q => [q.id, r(q.x0), r(q.y0), r(q.x), r(q.y), r(G.time - q.t)]),
        esc: G.esc ? [G.esc.id, r(G.esc.at - G.time)] : null, lg: G.lg };
    },
    apply(G, x) {
      if (!G.plan) { G.plan = x.pl; G.it = rebuildItems(G.plan, x.it); }
      if (!G.gd.length) G.gd = x.gd.map((v, id) => ({ id, x: v[0], y: v[1], a: v[2], st: 'pat', sus: 0, walk: 0, route: [], path: [] }));
      GD.apply(G, x.gd);
      x.it.forEach((v, i) => { const it = G.it[i]; if (it) { it.st = v[0]; it.c = v[1]; } });
      G.sr = {}; for (const k of x.sr) G.sr[k] = 1; G.ck = x.ck; [G.o1, G.o2, G.o3, G.lz, G.sw, G.cb] = x.o; G.left = x.left;
      G.alE = x.al[0] > 0 ? G.time + x.al[0] : 0; G.alP = x.al[1];
      for (const k in x.dk) G.dk[k] = x.dk[k] > 0 ? G.time + x.dk[k] : 0; G.cellO = x.co > 0 ? G.time + x.co : 0;
      for (const q of x.cn) if (!G.cn.some(o => o.id === q[0])) G.cn.push({ id: q[0], x0: q[1], y0: q[2], x: q[3], y: q[4], t: G.time - q[5] });
      G.esc = x.esc ? { id: x.esc[0], at: G.time + x.esc[1] } : null;
      for (const e of x.lg || []) if (e.n > G.lgN) { G.lgN = e.n; if (G.time > 0.3) show(G, e); }
    },
    // NOTTE: luci del soffitto per ala (il quadro elettrico le spegne), torce delle guardie, telecamere; io vedo poco intorno a me
    night(G) {
      if (!G.plan) return null;
      const me = G.me, M = MP(), near = (x, y, k) => Math.abs(x - cq.x) < k && Math.abs(y - cq.y) < k, lights = [[cq.x, cq.y, MY_R, 0.9]];
      for (const [x, y, a] of M.lamps) if (near(x, y, 15) && !(a !== 'X' && G.time < (G.dk[a] || 0))) lights.push([x, y, 3.6, 0.72]);
      for (const g of G.gd) if (g.st !== 'ko' && near(g.x, g.y, 18)) lights.push([g.x, g.y, (darkAt(G, g.x, g.y) ? DARK_R : 4.6) * 1.05, 0.8, scrA(g.a), GD.HALF * 1.15]);
      if (!G.o3) lights.push([M.teca.x + 0.5, M.teca.y + 0.5, 2.2, 0.7]);
      for (const c of G.chars) if (c !== me && c.alive && !c.esc && near(c.x, c.y, 16)) lights.push([c.x, c.y, 1.6, 0.6]);
      return { a: 0.8, r: MY_R, lights, see: () => true };
    },
    deco(g, c, X, Y, TW, G) {
      if (c.op) { const k = Math.min(1, (G.time - c.op.t0) / c.op.d); g.strokeStyle = '#f2c84a'; g.lineWidth = 4; g.beginPath(); g.arc(X, Y - TW * 2.1, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); }
      if (c.dm) { g.font = Math.round(TW * 0.4) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💎', X + TW * 0.35, Y - TW * 1.2 + Math.sin(performance.now() / 200) * 2); }
      if (c.jail) { g.strokeStyle = '#8a9098'; g.lineWidth = 2; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X + s * TW * 0.18, Y - TW * 0.45, TW * 0.08, TW * 0.05, 0, 0, 7); g.stroke(); } }
    },
    over(g, G, sx, sy, TW) {
      if (!G.plan) return;
      const me = G.me, W2 = cq.w, H2 = cq.h, M = MP(), now = performance.now() / 1000, near = (x, y, r) => Math.abs(x - cq.x) < r && Math.abs(y - cq.y) < r;
      const wedge = (pts, col, line) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(sx(x, y), sy(x, y)) : g.moveTo(sx(x, y), sy(x, y))); g.closePath(); g.fill(); if (line) { g.strokeStyle = line; g.lineWidth = 1.5; g.stroke(); } };
      // CONI DI VISTA delle guardie che vedo (fermati dai muri) e delle telecamere accese
      for (const gd of G.gd) {
        if (gd.st === 'ko' || !guardSeen(G, gd)) continue;
        const R = rangeAt(G, gd.x, gd.y) * (alertOn(G) ? 1.22 : 1), ch = gd.st === 'chase', su = gd.sus > 0.05;
        wedge(GD.cone(gd.x, gd.y, gd.a, R), ch ? 'rgba(255,60,50,.26)' : su ? 'rgba(255,150,40,.24)' : 'rgba(255,236,150,.17)', ch ? 'rgba(255,80,60,.7)' : su ? 'rgba(255,170,60,.6)' : 'rgba(255,236,150,.4)');
      }
      M.hcams.forEach((cm, i) => {
        if (!near(cm.x, cm.y, 16)) return; const off = darkAt(G, cm.x, cm.y), X = sx(cm.x, cm.y), Y = sy(cm.x, cm.y) - TW * 1.0;
        if (!off) wedge(GD.cone(cm.x, cm.y, GD.camA(G, cm), cm.r, cm.h, 12), (G.cs[i] || 0) > 0.05 ? 'rgba(255,60,50,.24)' : 'rgba(255,90,90,.13)', 'rgba(255,90,90,.4)');
        g.fillStyle = off ? '#333' : (now * 2 | 0) % 2 ? '#ff3030' : '#801818'; g.beginPath(); g.arc(X, Y, 3.5, 0, 7); g.fill();
      });
      // segni sopra le guardie (? ! …)
      for (const gd of G.gd) if (guardSeen(G, gd)) GD.mark(g, gd, sx(gd.x, gd.y), sy(gd.x, gd.y), TW);
      // la guardia col badge: si vede la tessera alla cintura (da vicino)
      if (G.plan.gb >= 0 && G.it.some(i => i.s === 'guard' && i.st === 0)) { const gd = G.gd[G.plan.gb]; if (gd && guardSeen(G, gd) && Math.hypot(gd.x - cq.x, gd.y - cq.y) < 6) { g.font = Math.round(TW * 0.32) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💳', sx(gd.x, gd.y) + TW * 0.3, sy(gd.x, gd.y) - TW * 0.9); } }
      // stelline sui posti da frugare
      for (const k of needSpots(G)) { const s = spot(G, k); if (!near(s.x, s.y, 14)) continue; const X = sx(s.x + 0.5, s.y + 0.5), Y = sy(s.x + 0.5, s.y + 0.5) - TW * 1.25 + Math.sin(now * 3 + s.x) * 3, q = TW * (0.13 + 0.04 * Math.sin(now * 5 + s.y)); star(g, X, Y, q, '#fff4b8'); }
      if (conf(G).length) { const s = M.SP.conf; if (near(s.x, s.y, 14)) star(g, sx(s.x + 0.5, s.y + 0.5), sy(s.x + 0.5, s.y + 0.5) - TW * 1.6, TW * 0.16, '#ff9a6a'); }
      // cartello "Non disturbare" sulla porta della camera del direttore
      if ((G.plan.a === 'asc' && G.it.some(i => i.s === 'comod')) || (G.plan.b === 'tas' && G.plan.bc === 'split')) { const r = M.camere[G.plan.dr], [dx, dy] = r.door; if (near(dx, dy, 14)) { const X = sx(dx + 1, dy + (r.top ? 0.2 : 0.8)), Y = sy(dx + 1, dy + 0.5) - TW * 1.3; g.fillStyle = '#c8302a'; cqRR(g, X - 15, Y - 7, 30, 14, 3); g.fill(); g.fillStyle = '#fff'; g.font = '700 7px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NON', X, Y - 3); g.fillText('DISTURBARE', X, Y + 3.5); } }
      // passaggi fuori servizio e sbarramenti
      for (const k in M.gates) { const gt = M.gates[k]; if (!near(gt.s[0], gt.s[1], 14)) continue; const X = sx(gt.s[0] - 0.5, gt.s[1] - 0.5), Y = sy(gt.s[0] - 0.5, gt.s[1] - 0.5) - TW * 2.1; g.font = Math.round(TW * 0.42) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k !== G.plan.a ? '🚫' : G.o1 ? '✅' : '🔒', X, Y); }
      // porta del caveau: tastierino / impronta / due serrature
      { const V = M.vdoor; if (near(V.s[0], V.s[1], 14) && !G.o2) { g.font = Math.round(TW * 0.4) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        if (G.plan.b === 'dop') for (const [sd, q] of [[0, V.kl], [1, V.kr]]) { const X = sx(q[0], q[1]), Y = sy(q[0], q[1]) - TW * 1.4, on = G.time - G.tk[sd] < TURN_WIN; g.fillText(on ? '🔓' : '🗝️', X, Y); }
        else g.fillText(G.plan.b === 'tas' ? '🔢' : '🖐️', sx(V.s[0] - 0.5, V.s[1] - 0.6), sy(V.s[0] - 0.5, V.s[1] - 0.6) - TW * 1.9); } }
      // teca: laser (se accesi) e diamante
      { const T = M.teca; if (near(T.x, T.y, 14)) {
        if (lasersOn(G)) { const z = TW * 0.35, P4 = [[T.x - 1, T.y - 1], [T.x + 2, T.y - 1], [T.x + 2, T.y + 2], [T.x - 1, T.y + 2]]; g.strokeStyle = 'rgba(255,40,40,' + (0.6 + 0.3 * Math.sin(now * 9)) + ')'; g.lineWidth = 1.5; for (const h of [0.3, 0.7]) { g.beginPath(); P4.concat([P4[0]]).forEach(([x, y], i) => i ? g.lineTo(sx(x, y), sy(x, y) - z * h * 3) : g.moveTo(sx(x, y), sy(x, y) - z * h * 3)); g.stroke(); } }
        if (!G.o3) { const X = sx(T.x + 0.5, T.y + 0.5), Y = sy(T.x + 0.5, T.y + 0.5) - TW * 1.2 + Math.sin(now * 2) * 2; diamond(g, X, Y, TW * 0.22, now); }
        if (G.plan.c === 'cmb' && !G.cb && G.o2) { g.font = Math.round(TW * 0.36) + 'px system-ui'; g.textAlign = 'center'; g.fillText('🎛️', sx(T.x + 0.5, T.y + 0.5) + TW * 0.5, sy(T.x + 0.5, T.y + 0.5) - TW * 0.7); } } }
      // monetine in volo e a terra
      for (const q of G.cn) { const a = G.time - q.t; if (a > 6 || !near(q.x, q.y, 16)) continue; const k = Math.min(1, a / 0.5), x = q.x0 + (q.x - q.x0) * k, y = q.y0 + (q.y - q.y0) * k, z = Math.sin(k * Math.PI) * TW * 1.4; g.fillStyle = '#f2c84a'; g.beginPath(); g.ellipse(sx(x, y), sy(x, y) - z - TW * 0.1, 4, 2.5, 0, 0, 7); g.fill(); if (k >= 1 && a < 1.3) { g.strokeStyle = 'rgba(255,220,120,' + (1 - (a - 0.5) / 0.8) + ')'; g.lineWidth = 2; g.beginPath(); g.ellipse(sx(x, y), sy(x, y), TW * (a - 0.4) * 2, TW * (a - 0.4), 0, 0, 7); g.stroke(); } }
      // furgone: freccia per chi ha il diamante
      if (me.dm && !me.jail) SQ.edge(g, sx(M.van.x, M.van.y), sy(M.van.x, M.van.y) - TW, W2, H2, '🚐', '#3fae5a');
      // allerta: bordo rosso che pulsa; inseguito: bordi rossi col battito
      if (alertOn(G)) { const a = 0.18 + 0.12 * Math.sin(now * 4); g.strokeStyle = 'rgba(255,40,40,' + a + ')'; g.lineWidth = 8; g.strokeRect(4, 4, W2 - 8, H2 - 8); }
      if (G.hb > 0) { const k = Math.max(0, 1 - (performance.now() - (G.hbP || 0)) / 380), a = 0.12 + 0.3 * G.hb * (0.5 + 0.5 * k); const gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.3, W2 / 2, H2 / 2, Math.max(W2, H2) * 0.72); gr.addColorStop(0, 'rgba(160,0,0,0)'); gr.addColorStop(1, 'rgba(160,0,0,' + a + ')'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); }
      if (me.jail) { g.fillStyle = 'rgba(30,34,44,.35)'; g.fillRect(0, 0, W2, H2); }
      board(g, G); minimap(g, G, W2);
    }
  };
  // vedo questa guardia? linea di vista libera e non troppo lontano (dalla cella: la finestrella sul corridoio e la sala della sicurezza)
  function guardSeen(G, gd) {
    const me = G.me, d = Math.hypot(gd.x - cq.x, gd.y - cq.y);
    if (me.jail && !(G.cellO > G.time)) return (gd.y < 11 && gd.x > 43) || d < 4;
    if (d > SEE_G) return false; if (d < 1.5) return true;
    return GD.los(cq.x, cq.y, gd.x, gd.y);
  }
  function star(g, X, Y, s, col) { const q = s * 0.28; g.fillStyle = col; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(X, Y - s); g.lineTo(X + q, Y - q); g.lineTo(X + s, Y); g.lineTo(X + q, Y + q); g.lineTo(X, Y + s); g.lineTo(X - q, Y + q); g.lineTo(X - s, Y); g.lineTo(X - q, Y - q); g.closePath(); g.fill(); g.globalAlpha = 1; }
  function diamond(g, X, Y, s, t) {
    g.fillStyle = '#bfefff'; g.beginPath(); g.moveTo(X - s, Y - s * 0.3); g.lineTo(X - s * 0.5, Y - s * 0.8); g.lineTo(X + s * 0.5, Y - s * 0.8); g.lineTo(X + s, Y - s * 0.3); g.lineTo(X, Y + s); g.closePath(); g.fill();
    g.fillStyle = '#7fd8ff'; g.beginPath(); g.moveTo(X - s, Y - s * 0.3); g.lineTo(X + s, Y - s * 0.3); g.lineTo(X, Y + s); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6); g.beginPath(); g.arc(X - s * 0.3, Y - s * 0.45, s * 0.15, 0, 7); g.fill(); g.globalAlpha = 1;
  }
  // gli oggetti del colpo nello stesso ordine dell'host (makePlan): tipi ricostruiti dal piano, posti sconosciuti agli amici (non servono)
  function rebuildItems(pl, arr) {
    const ks = [ACC[pl.a].it]; if (pl.b === 'imp') ks.push('imp'); if (pl.b === 'dop') ks.push('kA', 'kB'); if (pl.c === 'pes') ks.push('fake'); ks.push('diam');
    return ks.map((k, i) => ({ k, s: arr[i] ? arr[i][2] : null, c: arr[i] ? arr[i][1] : -1, st: arr[i] ? arr[i][0] : 0 }));
  }

  // ---- LAVAGNA DEL PIANO (in alto a sinistra; toccandola si apre con gli indizi) ----
  const ACCT = { asc: ['🛗', 'Ascensore di servizio'], sca: ['🚪', 'Scala antincendio'], mon: ['📦', 'Montacarichi'] };
  const DOORT = { tas: ['🔢', 'Tastierino'], imp: ['🖐️', 'Impronta'], dop: ['🗝️', 'Due chiavi'] };
  const TECT = { las: ['🔴', 'Laser'], pes: ['⚖️', 'Sensore di peso'], cmb: ['🎛️', 'Combinazione'] };
  function rows(G) {
    const pl = G.plan, st = (ok, part) => ok ? '✅' : part ? '🟡' : '○';
    const r1 = [ACCT[pl.a][0], ACCT[pl.a][1], G.o1 ? '✅' : has(G, ACC[pl.a].it) ? '💳🟡'.replace('💳', KIND[ACC[pl.a].it][0]) : conf(G).some(i => i.k === ACC[pl.a].it) ? '📦' : '○'];
    const r2 = [DOORT[pl.b][0], DOORT[pl.b][1], G.o2 ? '✅' : pl.b === 'tas' ? codeTxt(G) : pl.b === 'imp' ? st(0, has(G, 'imp')) : (has(G, 'kA') ? '🗝️' : '·') + (has(G, 'kB') ? '🗝️' : '·')];
    const r3 = [TECT[pl.c][0], TECT[pl.c][1], G.o3 ? '✅' : st(0, pl.c === 'las' ? G.lz : pl.c === 'pes' ? has(G, 'fake') : 0)];
    const r4 = ['🚐', 'Fuga col diamante', G.esc ? '✅' : G.o3 ? '💎' : '○'];
    return [r1, r2, r3, r4];
  }
  function board(g, G) {
    if (G.big) return;
    const R = rows(G), x0 = 10, y0 = 122, w = 168, lh = 21, h = 22 + R.length * lh, fresh = G.lvT && performance.now() - G.lvT < 1500 ? 1 - (performance.now() - G.lvT) / 1500 : 0;
    const step = G.o3 ? 3 : G.o2 ? 2 : G.o1 ? 1 : 0;
    g.save(); g.fillStyle = 'rgba(22,34,30,.85)'; cqRR(g, x0, y0, w, h, 10); g.fill(); g.strokeStyle = fresh ? 'rgba(255,216,74,' + (0.4 + 0.6 * fresh) + ')' : 'rgba(200,190,160,.35)'; g.lineWidth = 1.5 + 2 * fresh; g.stroke();
    g.fillStyle = '#e8e0c8'; g.font = '700 11px system-ui,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('📋 IL COLPO · tocca', x0 + 9, y0 + 12);
    R.forEach((r, i) => {
      const y = y0 + 24 + i * lh + lh / 2 - 2; g.globalAlpha = i === step ? 1 : i < step ? 0.55 : 0.75;
      if (i === step) { g.fillStyle = 'rgba(255,216,74,.14)'; g.fillRect(x0 + 3, y - lh / 2 + 1, w - 6, lh - 2); }
      g.font = '13px system-ui,sans-serif'; g.fillStyle = '#fff'; g.fillText(r[0], x0 + 8, y); g.font = '600 11px system-ui,sans-serif'; g.fillStyle = '#e8e0c8'; g.fillText(r[1], x0 + 28, y);
      g.textAlign = 'right'; g.font = '700 11px system-ui,sans-serif'; g.fillStyle = TC; g.fillText(r[2], x0 + w - 8, y); g.textAlign = 'left';
    });
    g.restore();
  }
  // il piano completo con gli indizi (pannello)
  function planUI(G) {
    const pl = G.plan, it = k => { const i = G.it.find(o => o.k === k); return !i ? '' : i.st === 1 ? ' — <b>✅ ce l\'ha ' + esc((byId(G, i.c) || {}).name || '') + '</b>' : i.st === 2 ? ' — <b>📦 confiscato!</b> (armadio delle confische, sala della sicurezza)' : i.st === 3 ? ' — ✅ usato' : ''; };
    const A = { asc: '🛗 <b>Ascensore di servizio</b> (in fondo alla hall). Scala antincendio e montacarichi stanotte sono chiusi.<br>Serve 💳 <b>il badge del direttore</b>: nella sua giacca al guardaroba, sul comodino della sua camera (cartello «Non disturbare») oppure in tasca a una guardia (stordiscila e frugala).' + it('badge'),
      sca: '🚪 <b>Scala antincendio</b> (in fondo al bar). Ascensore e montacarichi stanotte sono chiusi.<br>Serve 🔑 <b>la chiave della scala</b>: nel cassetto della reception o nello stanzino del custode.' + it('kSca'),
      mon: '📦 <b>Montacarichi delle cucine</b>. Ascensore e scala antincendio stanotte sono chiusi.<br>Serve 🔑 <b>la chiavetta dello chef</b>: nel suo armadietto (spogliatoio) o sul bancone della cucina.' + it('kMon') }[pl.a];
    const B = pl.b === 'tas' ? '🔢 <b>Tastierino</b>: serve il codice. ' + { post: 'Il direttore l\'ha scritto su un post-it sulla scrivania del suo ufficio.', split: 'Le prime due cifre sono nell\'agenda della segretaria, le ultime due nella cassaforte della camera del direttore («Non disturbare»).', mon: 'Rivedete la registrazione ai monitor della sala della sicurezza: si vede il direttore che lo digita.' }[pl.bc] + ' Codice: <b>' + codeTxt(G) + '</b> (sbagliarlo fa rumore!)'
      : pl.b === 'imp' ? '🖐️ <b>Lettore d\'impronta</b>: serve l\'impronta del direttore, sul suo bicchiere al bancone del bar o sulla tazzina nel suo ufficio.' + it('imp')
      : '🗝️ <b>Doppia serratura</b>: due chiavi, una ai piani di sopra (scaffale dell\'ufficio del direttore, armadietto dello spogliatoio o scaffale del custode) e una nell\'interrato (lavatrice o scaffale dei vini). Vanno girate INSIEME, da due ladri, una a sinistra e una a destra della porta.' + it('kA') + it('kB');
    const C = pl.c === 'las' ? '🔴 <b>Laser</b> intorno alla teca: spegneteli dal quadro elettrico nel locale tecnico (accanto alla sicurezza). Una guardia andrà a controllare.' + (G.lz ? ' — ✅ spenti' : '')
      : pl.c === 'pes' ? '⚖️ <b>Sensore di peso</b>: serve il diamante finto, nella vetrina del negozio di souvenir.' + it('fake')
      : '🎛️ <b>Cassaforte a combinazione</b>: va ascoltata con calma (12 s fermi, e ogni 3 s fa rumore).' + (G.cb ? ' — ✅ aperta' : '');
    cqCloseTask(); $('#tkTitle').textContent = '📋 Il colpo di stanotte';
    $('#tkBody').innerHTML = `<p class="lead" style="text-align:left;font-size:14px;line-height:1.5">1) ${A}</p><p class="lead" style="text-align:left;font-size:14px;line-height:1.5">2) ${B}</p><p class="lead" style="text-align:left;font-size:14px;line-height:1.5">3) ${C}</p><p class="lead" style="text-align:left;font-size:14px;line-height:1.5">4) 🚐 Portate il diamante al furgone nel cortile.</p><p class="hint">⭐ Le stelline indicano i posti da frugare. Se vi prendono finite in cella (sala della sicurezza) e perdete quello che avete in tasca. 🪙 monetina: distrae le guardie. 👊 alle spalle di una guardia: la stordisci. ⚡ quadro elettrico: luci di un'ala spente per ${DARK_T} s.</p>`;
    $('#tkHint').textContent = ''; $('#tkClose').hidden = false; $('#cqTask').hidden = false; $('#tkClose').onclick = () => cqCloseTask();
  }
  // tastierino
  function keypadUI(G) {
    cqCloseTask(); let v = '';
    $('#tkTitle').textContent = '🔢 Tastierino del caveau';
    const draw = () => { $('#kpD').textContent = (v + '____').slice(0, 4).split('').join(' '); };
    $('#tkBody').innerHTML = `<p class="lead">Codice sulla lavagna: <b>${codeTxt(G)}</b>${codeAll(G) ? '' : '<br><span style="color:#ff8a70">Non avete il codice completo: se sbagliate, il tastierino suona!</span>'}</p><div id="kpD" style="font:800 30px monospace;text-align:center;letter-spacing:4px;margin:8px 0">_ _ _ _</div><div style="display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:center">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map(k => `<button type="button" class="big" data-k="${k}" style="height:52px;font-size:20px">${k}</button>`).join('')}</div>`;
    $('#tkHint').textContent = ''; $('#tkClose').hidden = false; $('#cqTask').hidden = false; $('#tkClose').onclick = () => cqCloseTask();
    $('#tkBody').querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k; beep(1000 + (+k || 0) * 40, 0.04, 0.03);
      if (k === 'C') v = ''; else if (k === 'OK') { if (v.length < 4) return; const G2 = cq.g; cqCloseTask(); if (!G2 || G2.mode !== 'colpo') return; if (G2.guest) cqNetSend({ k: 'a', a: 'kpv', v }); else doAct(G2, G2.me, { k: 'kpv', v }); return; }
      else if (v.length < 4) v += k; draw();
    });
  }
  // quadro elettrico: luci di un'ala o laser
  function quadroUI(G) {
    cqCloseTask(); const ok = a => (G.dk[a] || 0) + DARK_CD <= G.time;
    $('#tkTitle').textContent = '⚡ Quadro elettrico';
    $('#tkBody').innerHTML = `<p class="lead">Spegni le luci di un'ala per ${DARK_T} secondi: le guardie vedono meno e le telecamere si spengono. Ma una guardia verrà a controllare il quadro!</p>${Object.keys(ALA).map(a => `<button type="button" class="big" data-o="${a}" ${ok(a) ? '' : 'disabled'} style="display:block;width:100%;margin:6px 0">💡 ${ALA[a]}${ok(a) ? '' : ' (non ancora)'}</button>`).join('')}${G.plan.c === 'las' && !G.lz ? '<button type="button" class="big" data-o="L" style="display:block;width:100%;margin:10px 0 6px;background:#8a2a2a;color:#fff">🔴 Spegni i laser della teca</button>' : ''}`;
    $('#tkHint').textContent = ''; $('#tkClose').hidden = false; $('#cqTask').hidden = false; $('#tkClose').onclick = () => cqCloseTask();
    $('#tkBody').querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o, G2 = cq.g; cqCloseTask(); if (!G2 || G2.mode !== 'colpo') return; if (G2.guest) cqNetSend({ k: 'a', a: 'quad', o }); else doAct(G2, G2.me, { k: 'quad', o }); thud(0.5, 120); });
  }
  // evasione: grimaldello a tempo (3 colpi nella zona verde; uno sbagliato = allerta)
  function pickUI(G) {
    cqCloseTask(); let n = 0, done = false, t0 = performance.now(), zone = 0.35 + Math.random() * 0.4;
    $('#tkTitle').textContent = '🔓 Evasione: grimaldello';
    $('#tkBody').innerHTML = `<p class="lead">Premi quando l'ago è nella zona verde, 3 volte. Se sbagli scatta l'<b>allerta</b>!</p><div style="position:relative;height:34px;background:#2a2e36;border-radius:8px;margin:14px 0;overflow:hidden"><div id="pkZ" style="position:absolute;top:0;bottom:0;background:#3fae5a"></div><div id="pkN" style="position:absolute;top:0;bottom:0;width:4px;background:#fff"></div></div><div id="pkC" style="text-align:center;font:700 18px system-ui">🔒 🔒 🔒</div><button type="button" class="big" id="pkGo" style="display:block;width:100%;height:64px;margin-top:10px;font-size:22px">ORA!</button>`;
    $('#tkHint').textContent = ''; $('#tkClose').hidden = true; $('#cqTask').hidden = false;
    const zw = 0.14, Z = $('#pkZ'), N = $('#pkN'); const setZ = () => { Z.style.left = zone * 100 + '%'; Z.style.width = zw * 100 + '%'; }; setZ();
    const pos = () => { const t = (performance.now() - t0) / 1000 * (0.9 + n * 0.25); return Math.abs(((t % 2) + 2) % 2 - 1); };
    const send = ok => { done = true; const G2 = cq.g; setTimeout(() => cqCloseTask(), ok ? 400 : 700); if (!G2 || G2.mode !== 'colpo') return; if (G2.guest) cqNetSend({ k: 'a', a: 'ev', ok: ok ? 1 : 0 }); else doAct(G2, G2.me, { k: 'ev', ok }); };
    (function anim() { if (done || $('#cqTask').hidden || !$('#pkN')) return; N.style.left = pos() * 100 + '%'; requestAnimationFrame(anim); })();
    $('#pkGo').onclick = () => { if (done) return; const p = pos(); if (p >= zone - 0.01 && p <= zone + zw + 0.01) { n++; beep(900 + n * 150, 0.06, 0.04); $('#pkC').textContent = '🔓 '.repeat(n) + '🔒 '.repeat(3 - n); zone = 0.1 + Math.random() * 0.75; setZ(); if (n >= 3) send(true); } else { beep(180, 0.3, 0.05, 0, 'sawtooth'); $('#pkC').textContent = '💥 Sbagliato!'; send(false); } };
  }

  // ---- MAPPA: radar in alto a destra, grande toccandolo ----
  function mapImg() {
    const M = MP(); if (M.mimg) return M.mimg;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const sg = c.getContext('2d', CQ_CPU), im = sg.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, r = M.ROOM[i], fl = cqFloor[y] && cqFloor[y][x], s = cqSolid[y] && cqSolid[y][x];
      let col = [16, 18, 22]; if (fl) { const R = M.rooms[r >= 0 ? r : M.hall]; const h = parseInt(R.c[0].slice(1), 16); col = [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => Math.min(255, v * 1.15 + 18)); if (s && !s.wall) col = col.map(v => v * 0.7); } else if (s && s.wall) col = [60, 58, 56];
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    sg.putImageData(im, 0, 0); return (M.mimg = c);
  }
  function mapDraw(g, G, X, Y, R, s, cx, cy, big) {
    const me = G.me, M = MP(), img = mapImg(), now = performance.now();
    const P2 = (x, y) => [X + (x - cx - (y - cy)) * s * 0.7071, Y + (x - cx + (y - cy)) * s * 0.7071];
    g.save();
    g.fillStyle = 'rgba(10,12,16,.88)'; g.strokeStyle = '#c8a040'; g.lineWidth = 2.5; g.beginPath(); if (big) cqRR(g, X - R, Y - R, R * 2, R * 2, 16); else g.arc(X, Y, R, 0, 7); g.fill(); g.stroke();
    g.beginPath(); if (big) cqRR(g, X - R + 3, Y - R + 3, R * 2 - 6, R * 2 - 6, 14); else g.arc(X, Y, R - 2, 0, 7); g.clip();
    g.translate(X, Y); g.rotate(Math.PI / 4); g.scale(s, s); g.translate(-cx, -cy); g.imageSmoothingEnabled = false; g.globalAlpha = 0.9; g.drawImage(img, 0, 0); g.globalAlpha = 1; g.setTransform(cq.dpr || 1, 0, 0, cq.dpr || 1, 0, 0);
    const dot = (x, y, r, col, ring) => { const [a, b] = P2(x, y); g.fillStyle = col; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); if (ring) { g.strokeStyle = ring; g.lineWidth = 1.5; g.stroke(); } };
    const ico = (x, y, t, sz) => { const [a, b] = P2(x, y); g.font = sz + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, a, b); };
    const sz = big ? 13 : 10;
    for (const k of needSpots(G)) { const sp = spot(G, k); dot(sp.x + 0.5, sp.y + 0.5, big ? 4 : 3, 'rgba(255,240,170,' + (0.6 + 0.4 * Math.sin(now / 250)) + ')'); }
    if (conf(G).length) ico(M.SP.conf.x + 0.5, M.SP.conf.y + 0.5, '📦', sz);
    if (!G.o1) { const gt = M.gates[G.plan.a]; ico(gt.s[0], gt.s[1], gt.e, sz); }
    else if (!G.o3) ico(M.teca.x + 0.5, M.teca.y + 0.5, '💎', sz);
    if (G.plan.c === 'las' && !G.lz && G.o1) ico(M.SP.quadro.x + 0.5, M.SP.quadro.y + 0.5, '⚡', sz - 1);
    ico(M.van.x, M.van.y, '🚐', sz);
    if (G.chars.some(c => c.jail)) ico(59.5, 4.5, '⛓️', sz);
    for (const gd of G.gd) if (guardSeen(G, gd)) dot(gd.x, gd.y, 3, gd.st === 'chase' ? '#ff3030' : gd.st === 'ko' ? '#888' : '#ff9a4a', '#000');
    for (const c of G.chars) if (c !== me && c.alive && !c.esc) dot(c.x, c.y, 3, c.jail ? '#9aa0a8' : TC, '#000');
    const [mx, my] = P2(cq.x, cq.y), wx = cq.wdx || 1, wy = cq.wdy || 0, ang = Math.atan2((wx + wy) * 0.7071, (wx - wy) * 0.7071);
    g.translate(mx, my); g.rotate(ang); g.fillStyle = '#ffffff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -5); g.lineTo(-2.5, 0); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  const RADAR = 66;
  function minimap(g, G, W2) {
    if (G.big) { const H2 = cq.h, R = Math.min(W2 - 24, H2 - 300, 440) / 2, cy = Math.max(130 + R, H2 / 2 - 40); mapDraw(g, G, W2 / 2, cy, R, (R * 2 - 10) / (Math.max(W, H) * 1.4142), W / 2, H / 2, true);
      g.font = '600 12px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(230,236,255,.85)'; g.fillText('Tocca la mappa per chiuderla', W2 / 2, cy + R + 16); return; }
    mapDraw(g, G, W2 - RADAR - 8, 122 + RADAR, RADAR, 3.2, cq.x, cq.y, false);
    g.font = '600 10px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(230,236,255,.75)'; g.fillText('🗺️ tocca', W2 - RADAR - 8, 122 + RADAR * 2 + 12);
  }

  // FRASI DI FINE PARTITA (con qualche parolaccia, come negli altri giochi): al massimo 4
  function funny(G, won) {
    const L = [], N = c => '<b>' + esc(c.name) + '</b>', add = (pr, t) => L.push([pr + Math.random() * 0.5, t]);
    const J = G.chars.filter(c => c.jail);
    if (won) {
      if (G.time < 240) add(9, 'Colpo fatto in ' + mmss(G.time) + ': le guardie stavano ancora cercando le chiavi della macchinetta del caffè.');
      if (J.length) add(8, J.map(N).join(' e ') + (J.length > 1 ? ' sono rimasti' : ' è rimasto') + ' in cella. La banda ringrazia per il sacrificio. O se n\'è proprio sbattuta.');
      if (!G.chars.some(c => c.ca)) add(7, 'Nessuno preso, nemmeno una volta: professionisti veri, cazzo.');
      if (G.left < 30) add(9, 'Furgone partito con ' + Math.ceil(G.left) + ' secondi sul timer: le sirene si sentivano già.');
    } else {
      if (J.length === G.chars.length) add(8, 'Tutta la banda in cella: almeno giocate a carte insieme.');
      if (G.o3) add(9, 'Avevate il diamante in mano e vi siete fatti fregare. Che culo… degli altri.');
      if (!G.o1) add(6, 'Non siete nemmeno arrivati all\'interrato. Ladri della domenica.');
    }
    for (const c of G.chars) {
      if ((c.ca || 0) >= 3) add(8, N(c) + ' è stato preso ' + c.ca + ' volte: in cella ormai ha il suo cuscino.');
      if ((c.ko || 0) >= 3) add(7, N(c) + ' ha stordito ' + c.ko + ' guardie: più che un ladro, un buttafuori.');
      if ((c.fr || 0) >= 2) add(7, N(c) + ' ha aperto la cella ' + c.fr + ' volte: avvocato di fiducia della banda.');
      if ((c.evf || 0) >= 1) add(6, N(c) + ' ha provato a evadere da solo e ha fatto suonare tutto. Bravo, coglione.');
      if ((c.ev || 0) >= 1) add(7, N(c) + ' è evaso da solo col grimaldello: Lupin chi?');
      if ((c.lo || 0) >= 2) add(5, N(c) + ' ha giocato col quadro elettrico ' + c.lo + ' volte. Bolletta salata per l\'hotel.');
    }
    L.sort((a, b) => b[0] - a[0]);
    const out = L.slice(0, 4).map(l => l[1]);
    return out.length ? '<br><span style="display:block;margin-top:10px;text-align:left;font-size:14px;line-height:1.45">' + out.map(t => '😂 ' + t).join('<br>') + '</span>' : '';
  }

  // ---- pulsanti: 🪙 monetina a sinistra, lavagna (trasparente sopra il disegno), mappa ----
  if (!document.getElementById('hcCss')) {
    const st = document.createElement('style'); st.id = 'hcCss';
    st.textContent = '#hcCoin{position:absolute;left:18px;bottom:142px;width:78px;height:78px;border-radius:50%;border:0;font:inherit;font-weight:800;font-size:26px;background:#c8a040;color:#2a2010;box-shadow:0 4px 14px rgba(0,0,0,.35);touch-action:none;user-select:none;-webkit-user-select:none}#hcCoin.off{background:#5a5a66;color:#ccc}#hcCoin small{display:block;font-size:12px;line-height:1}';
    document.head.appendChild(st);
  }
  const host = document.getElementById('ciack') || document.body;
  const mkBtn = (id, txt) => { let b = document.getElementById(id); if (!b) { b = document.createElement('button'); b.id = id; b.type = 'button'; b.hidden = true; b.innerHTML = txt; host.appendChild(b); } return b; };
  const coinB = mkBtn('hcCoin', '🪙'), mapB = mkBtn('hcMap', ''), boardB = mkBtn('hcBoard', '');
  const live = () => { const G = cq.g; return G && G.mode === 'colpo' && G.plan && G.phase === 'play' && G.pre <= 0 ? G : null; };
  function coinPress() {
    const G = live(); if (!G) return; const me = G.me; if (me.jail || (me.coins || 0) <= 0) { beep(180, 0.05, 0.03); return; }
    // la monetina vola davanti a me (dove sto andando), fermata dai muri
    const dx = cq.wdx || 1, dy = cq.wdy || 0, m = Math.hypot(dx, dy) || 1; let r = 0.5; while (r < 5 && !GD.opaque(cq.x + dx / m * r, cq.y + dy / m * r)) r += 0.25; r = Math.max(0.5, r - 0.4);
    const x = cq.x + dx / m * r, y = cq.y + dy / m * r;
    if (G.guest) { cqNetSend({ k: 'a', a: 'coin', x, y }); me.coins--; } else doAct(G, me, { k: 'coin', x, y });
    beep(1500, 0.05, 0.03); beep(1900, 0.05, 0.02, 0.45);
  }
  coinB.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); coinPress(); });
  mapB.onclick = e => { e.stopPropagation(); const G = live(); if (G) { G.big = !G.big; beep(G.big ? 700 : 500, 0.05, 0.02); } };
  boardB.onclick = e => { e.stopPropagation(); const G = live(); if (G) planUI(G); };
  if (!window.hcKeys) { window.hcKeys = 1; document.addEventListener('keydown', e => { if (e.repeat) return; const G = live(); if (!G || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return; const k = e.key.toLowerCase(); if (k === 'q') coinPress(); else if (k === 'm') G.big = !G.big; else if (k === 'l') planUI(G); }); }
  (function loop() {
    requestAnimationFrame(loop);
    const G = live(), panel = !$('#cqTask').hidden, me = G && G.me;
    const cOn = !!(G && !me.jail && !panel && !G.big);
    if (coinB.hidden === cOn) coinB.hidden = !cOn;
    if (cOn) { const t = '🪙<small>' + (me.coins || 0) + '</small>'; if (coinB.dataset.t !== t) { coinB.dataset.t = t; coinB.innerHTML = t; } coinB.classList.toggle('off', !(me.coins > 0)); }
    const mo = !!(G && !panel);
    if (mapB.hidden === mo) mapB.hidden = !mo; if (boardB.hidden === (mo && !G.big)) boardB.hidden = !(mo && !G.big);
    if (mo) { const W2 = cq.w, H2 = cq.h; let css;
      if (G.big) { const R = Math.min(W2 - 24, H2 - 300, 440) / 2, cy = Math.max(130 + R, H2 / 2 - 40); css = 'left:' + (W2 / 2 - R) + 'px;top:' + (cy - R) + 'px;width:' + 2 * R + 'px;height:' + 2 * R + 'px;border-radius:16px'; }
      else css = 'left:' + (W2 - 2 * RADAR - 8) + 'px;top:122px;width:' + 2 * RADAR + 'px;height:' + 2 * RADAR + 'px;border-radius:50%';
      if (mapB.dataset.k !== css) { mapB.dataset.k = css; mapB.style.cssText = 'position:absolute;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;' + css; }
      const bc = 'position:absolute;left:10px;top:122px;width:168px;height:' + (22 + 4 * 21) + 'px;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent';
      if (boardB.dataset.k !== bc) { boardB.dataset.k = bc; boardB.style.cssText = bc; } }
  })();
});
