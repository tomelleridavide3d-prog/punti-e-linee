// Colpo all'hotel (furto cooperativo furtivo). Gioco del motore: si registra in CQ_MODES (vedi "MOTORE DEI GIOCHI" in index.html).
// Usa i MODULI COMUNI (giochi/lib): guardie (ronde, cono di vista, ? -> !, telecamere), squadre (freccia sul bordo).
// GRAND HOTEL DI NOTTE, mappa FISSA (si impara a conoscerla) su TRE PIANI (si vede solo il piano dove sei):
//  - PIANO TERRA: hall di marmo con lo SCALONE, salone delle feste, bar, ristorante, boutique, guardaroba, cucine, zona del personale (sicurezza con la CELLA,
//    locale tecnico, custode, spogliatoio, scala di servizio); fuori 4 parcheggi: si entra da uno a caso e li' aspetta il furgone;
//  - PRIMO PIANO: galleria intorno all'atrio (il vuoto sopra la hall), ufficio del direttore, segreteria, camere e suite;
//  - INTERRATO: lavanderia, cantina, locale caldaie, archivio e il CAVEAU.
// TUTTI LADRI INSIEME contro le guardie del computer. Il DIAMANTE nel caveau e' sempre li', ma IL COLPO CAMBIA A OGNI PARTITA (G.plan):
//  1) come si scende all'interrato: ascensore di servizio (badge del direttore) / scala antincendio (chiave) / montacarichi (chiavetta dello chef);
//  2) la porta del caveau: tastierino (codice: post-it, due meta', registrazione ai monitor) / impronta del direttore / doppia serratura (in due);
//  3) la teca: laser (quadro elettrico) / sensore di peso (diamante finto) / cassaforte a combinazione (lenta e rumorosa); poi la FUGA al furgone.
// Si sa COSA serve (lavagna), non DOVE: i posti possibili sono indizi, quello vero e' a caso. PRESI = CELLA nella sala della sicurezza:
// la refurtiva va nell'armadio delle confische; i compagni liberano (4 s, rumore); dopo 60 s il prigioniero puo' tentare l'EVASIONE (se sbaglia: ALLERTA).
// Strumenti: 🪙 monetina (distrae), 👊 stordire da dietro, quadro elettrico (luci di un piano per 40 s; una guardia va a controllare).
CQ_WAIT.colpo = cqLib('squadre', 'guardie').then(L => {
  const SQ = L.squadre, GD = L.guardie;
  for (const t of ['fdoor', 'lift', 'fgate', 'bdoor', 'wardrobe', 'coats', 'wine', 'boxes', 'column', 'keys', 'bottles', 'palm', 'boiler', 'car', 'drape', 'bin']) GD.tall.add(t);   // le porte chiuse e i mobili alti fermano la vista
  // TRE PIANI AFFIANCATI nella stessa mappa, con 16 caselle di vuoto in mezzo (da un piano non si vede mai l'altro):
  // piano terra x 0-79 (l'hotel al centro, fuori i 4 parcheggi), primo piano x 96-155 (O1 = spostamento), interrato x 172-231 (OI).
  // Si passa da un piano all'altro entrando nelle caselle dei PASSAGGI (M.portals): lo scalone della hall, la scala di servizio, e i tre passaggi per l'interrato.
  const W = 232, H = 62, O1 = 86, OI = 162;
  const floorOf = x => x < 88 ? 0 : x < 164 ? 1 : 2;
  const FLN = ['Piano terra', 'Primo piano', 'Interrato'];
  const SRCH_T = 2, ACC_T = 1.5, PRT_T = 1.5, KP_T = 3, TURN_T = 1.2, TURN_WIN = 1.8, SWAP_T = 3, TAKE_T = 2, CMB_T = 12, FREE_T = 4, CONF_T = 2, LSR_T = 1.5;
  const HIDE_R = 1.35, EV_WAIT = 60, ALERT_T = 60, DARK_T = 40, DARK_CD = 30, COINS = 3, COIN_R = 6.5, STUN_R = 1.25, OP_R = 1.5, VAN_R = 1.9, CELL_OPEN = 6;
  const HB_R = 5, LIT_R = 6.4, DARK_R = 3.3, MY_R = 1.9, SEE_G = 22, WALK = 0.6, RUN_R = 4.5, LAMP_R = 2.0;
  const ALA = { T: 'Piano terra', S: 'Primo piano', I: 'Interrato' };
  // i 4 parcheggi da cui si puo' entrare (uno a caso a ogni partita): li' aspetta il furgone della fuga
  const ENT = ['Parcheggio principale', 'Vicolo delle cucine', 'Parcheggio del giardino', 'Parcheggio del personale'];
  const ENTD = ['davanti all\'ingresso principale, sul viale', 'dietro alle cucine, dove scaricano le merci', 'accanto alla piscina, nel giardino', 'sul fianco dell\'hotel, vicino alla porta del personale'];
  const TC = '#ffcf5a';
  const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const MP = () => CQ_MAP;
  const P = c => cqModePos(c);
  const dxy = (c, x, y) => { const p = P(c); return Math.hypot(p.x - x, p.y - y); };
  const byId = (G, id) => G.chars.find(c => c.id === id);
  const free = G => G.chars.filter(c => c.alive && !c.jail && !c.esc);
  const alertOn = G => !!(G.alP || G.time < (G.alE || 0));

  // ======================= MAPPA: GRAND HOTEL (fissa, su tre piani) =======================
  // colori dei muri (drawWall li riconosce): crema con la boiserie, legno, personale, cemento, siepe, mattoni
  const CREAM = '#cbbb98', WOOD = '#6a4a30', STAFF = '#7c8a86', CONC = '#4a4846', HEDGE = '#2f5a2e', BRICK = '#6a3a2e';
  const COR = ['#6e2626', '#6a2424'], PS = ['#4a4846', '#464442'];
  function mapHotel() {
    const rooms = [], doors = [], props = [], deco = [], lamps = [], holes = [], decals = [], camere = [];
    let ox = 0, fa = 'T';
    const R = (n, x, y, w, h, k, c, wc, o) => { rooms.push(Object.assign({ n, x: x + ox, y, w, h, k, c, wc, ala: fa }, o || {})); return rooms.length - 1; };
    const pp = (t, x, y, o) => props.push([t, x + ox, y, o]);
    const D = (x, y, w = 1, h = 1) => doors.push([x + ox, y, w, h]);
    const L = (x, y) => lamps.push([x + ox, y, fa]);
    const DC = (x, y, w, h, col) => decals.push([x + ox, y, w, h, col]);
    const row = (t, x0, x1, y, o) => { for (let x = x0; x <= x1; x++) pp(t, x, y, o); };
    const two = (t, x, y, o) => { pp(t, x, y, o); pp(t, x - 1, y, { part: 1 }); };   // oggetti lunghi 2 lungo x (auto, furgone): disegnati dalla casella davanti
    const four = (t, x, y, o) => { pp(t, x, y, o); pp(t, x - 1, y, { part: 1 }); pp(t, x, y - 1, { part: 1 }); pp(t, x - 1, y - 1, { part: 1 }); };   // 2x2 (letto, piano a coda, fontana)
    const X = { ala: 'X' };

    // ---------------- PIANO TERRA ----------------
    // fuori: vicolo (nord), giardino con la piscina (ovest), parcheggio del personale (est), viale d'ingresso col parcheggio principale (sud)
    R('Vicolo delle cucine', 1, 1, 78, 7, 'asphalt', ['#2c2e32', '#2a2c30'], BRICK, Object.assign({ lx: 30, ly: 4 }, X));
    R('Giardino', 1, 8, 9, 44, 'grass', ['#2f4b2b', '#2d4929'], HEDGE, Object.assign({ lx: 5, ly: 12 }, X));
    R('Parcheggio del personale', 70, 8, 9, 44, 'asphalt', ['#2c2e32', '#2a2c30'], HEDGE, Object.assign({ nl: 1 }, X));
    R('Viale d\'ingresso', 1, 52, 78, 9, 'paving', ['#57534d', '#534f49'], HEDGE, Object.assign({ lx: 20, ly: 58 }, X));
    R('Piscina', 3, 18, 5, 15, 'pooltile', ['#9ab0b4', '#94aaae'], HEDGE, Object.assign({ nl: 1 }, X));
    for (let y = 19; y <= 31; y++) for (let x = 4; x <= 6; x++) pp('pool', x, y);
    // ala ovest: bar (con la scala antincendio), cantinetta, ascensore di servizio, ristorante, boutique, guardaroba
    R('Bar americano', 11, 9, 11, 9, 'wood', ['#4e3222', '#4a3020'], WOOD, { lx: 17, ly: 16.6 });
    R('Scala antincendio', 11, 9, 2, 3, 'stairs', PS, CONC, { nl: 1 });
    holes.push([13, 9, 1, 3], [11, 12, 2, 1]); D(13, 10);
    R('Cantinetta', 11, 19, 7, 2, 'stone', ['#4a4036', '#463c34'], WOOD, { nl: 1 }); D(14, 18, 2, 1);
    R('Ascensore di servizio', 20, 19, 2, 2, 'liftf', PS, CONC, { nl: 1 }); D(22, 19, 1, 2);
    R('Ristorante', 11, 22, 11, 18, 'parq', ['#6a4628', '#664426'], CREAM, { ly: 38.6 }); D(22, 29, 1, 3); D(10, 28, 1, 3);
    R('Boutique', 11, 41, 11, 5, 'tile2', ['#d8d2c4', '#d0cabc'], CREAM, { ly: 44.7 }); D(22, 42, 1, 2);
    R('Guardaroba', 11, 47, 11, 4, 'royal', ['#3a2a4a', '#382848'], WOOD, { ly: 50.2 }); D(22, 48, 1, 2);
    D(22, 12, 1, 2); D(10, 13, 1, 2);
    const gal = R('Galleria', 23, 9, 3, 42, 'hcarp', COR, CREAM, { nl: 1 });
    // al centro: salone delle feste, hall di marmo con lo SCALONE, galleria est
    R('Salone delle feste', 27, 9, 26, 14, 'parq', ['#7a5230', '#764e2e'], CREAM, { ly: 21.3 }); D(26, 14, 1, 2); D(30, 23, 2, 1); D(48, 23, 2, 1); D(53, 12, 1, 2);
    R('Hall', 26, 24, 28, 27, 'marble', ['#d4ccbc', '#c4baa6'], CREAM, { lx: 32, ly: 48.6 });
    R('Scalone', 37, 24, 6, 10, 'stairc', ['#ddd4c2', '#d8cfbd'], CREAM, { nl: 1 });
    R('Galleria est', 54, 24, 3, 27, 'hcarp', COR, CREAM, { nl: 1 });
    D(38, 51, 4, 1);   // ingresso principale
    // ala est: cucine (montacarichi), corridoio di servizio, locale tecnico, custode, spogliatoio, sicurezza con la CELLA, scala di servizio
    R('Cucine', 54, 9, 15, 11, 'tile', ['#b8bcc0', '#b0b4b8'], '#8a9298', { ly: 18.6 }); D(60, 8, 2, 1); D(58, 20, 2, 1);
    R('Montacarichi', 55, 21, 2, 2, 'liftf', PS, CONC, { nl: 1 }); D(55, 20, 2, 1);
    R('Corridoio di servizio', 58, 21, 2, 22, 'lino', ['#7a8478', '#768074'], STAFF, { nl: 1 }); D(57, 27, 1, 2); D(57, 38, 1, 2);
    R('Scala di servizio', 58, 44, 2, 7, 'stairs', PS, CONC, { nl: 1 }); D(58, 43, 2, 1);
    R('Locale tecnico', 61, 21, 8, 6, 'concrete', ['#4e504e', '#4a4c4a'], STAFF, { ly: 26 }); D(60, 23, 1, 2);
    R('Stanzino del custode', 61, 28, 8, 5, 'concrete', ['#5e5a52', '#5a564e'], STAFF, { ly: 32 }); D(60, 30); D(69, 30, 1, 2);
    R('Spogliatoio', 61, 34, 8, 5, 'tile', ['#6a7a78', '#647472'], STAFF, { ly: 38 }); D(60, 36); D(69, 35, 1, 2);
    R('Sala della sicurezza', 61, 40, 8, 6, 'tile', ['#4a525c', '#465058'], STAFF, { ly: 44.4 }); D(60, 42, 1, 2);
    const cell = R('Cella', 61, 47, 8, 4, 'concrete', ['#5a5a58', '#565654'], STAFF, { ly: 50.2 }); D(65, 46, 2, 1);
    pp('cdoor', 65, 46); pp('cdoor', 66, 46);
    // arredi del piano terra
    // hall: reception, fontana, piano a coda, salotto, palme, colonne, candelabri ai piedi dello scalone, tappeto rosso dall'ingresso
    for (let y = 31; y <= 36; y++) pp('recdesk', 49, y, { b: y === 33 }); pp('keys', 52, 32); pp('keys', 52, 34); pp('monitor', 52, 36);
    for (let y = 41; y <= 44; y++) for (let x = 38; x <= 41; x++) pp('fount', x, y, x === 41 && y === 44 ? null : { part: 1 });   // fontana 4x4 al centro della hall
    four('piano', 31, 45, { o: 1 });
    row('vsofa', 29, 32, 33, { b: 'n' }); row('vsofa', 29, 32, 39, { b: 's' }); pp('armch', 28, 36, { c: '#7a1e2e' }); pp('armch', 34, 36, { c: '#7a1e2e' }); pp('ctable', 30, 36); pp('ctable', 31, 36);
    for (const [x, y] of [[27, 25], [52, 25], [27, 50], [52, 50], [36, 50], [43, 50]]) pp('palm', x, y);
    pp('candel', 36, 34); pp('candel', 43, 34);
    for (const y of [27, 31, 35, 39, 43, 47]) { pp('column', 26, y); pp('column', 53, y); }
    DC(38.75, 34, 2.5, 6.6, '#7a1e22'); DC(38.75, 45.2, 2.5, 6.8, '#7a1e22'); for (const [y, h] of [[34, 6.6], [45.2, 6.8]]) { DC(38.75, y, 0.09, h, '#c8a040'); DC(41.16, y, 0.09, h, '#c8a040'); }
    DC(28.2, 34.2, 6.6, 4.6, '#3a2442'); DC(28.4, 34.4, 6.2, 0.08, '#c8a040'); DC(28.4, 38.52, 6.2, 0.08, '#c8a040');
    pp('vase', 23, 23); pp('vase', 23, 37); pp('vase', 56, 33); pp('vase', 56, 46); pp('bench', 25, 25); pp('bench', 25, 46);
    // bar americano: bancone, bottiglie, sgabelli, tavolini
    // TENDE di velluto (nascondigli): s = muro a cui sono appese
    for (const [x, y, sd] of [[21, 9, 'n'], [11, 25, 'w'], [11, 35, 'w'], [33, 9, 'n'], [46, 9, 'n'], [33, 50, 's'], [46, 50, 's']]) pp('drape', x, y, { s: sd });
    row('bottles', 14, 20, 9); row('barc', 15, 19, 11); pp('stool', 15, 12); pp('stool', 17, 12); pp('stool', 19, 12);
    pp('rtable', 13, 15); pp('rtable', 16, 15); pp('rtable', 19, 15); pp('armch', 21, 16, { c: '#5a2a1a' }); pp('palm', 11, 17);
    row('wine', 11, 17, 20);
    // ristorante: tavoli tondi con la tovaglia e le candele
    for (const x of [13, 16, 19]) for (const y of [24, 27, 30, 33, 36]) pp('dtable', x, y);
    pp('palm', 11, 22); pp('palm', 21, 22); pp('palm', 11, 39);
    // boutique e guardaroba
    row('shelf', 12, 20, 41); pp('vitrine', 14, 43); pp('vitrine', 17, 43); pp('vitrine', 20, 43); pp('mirror', 11, 45);
    row('coats', 12, 19, 47); pp('counter', 21, 49); pp('mirror', 11, 50);
    // salone delle feste
    for (const [x, y] of [[29, 11], [29, 15], [29, 19], [50, 11], [50, 15], [50, 19], [34, 20], [45, 20]]) pp('dtable', x, y);
    four('piano', 37, 11, { o: 1 }); for (const [x, y] of [[27, 9], [52, 9], [27, 22], [52, 22]]) pp('palm', x, y);
    // cucine
    row('stove', 62, 66, 9); pp('fridge', 67, 9); pp('fridge', 68, 9); pp('shelf', 54, 9); pp('shelf', 54, 10); pp('shelf', 55, 9);
    pp('counter', 58, 14); pp('counter', 59, 14); pp('pot', 60, 14); pp('counter', 61, 14); pp('crate', 67, 18); pp('crate', 68, 18); pp('bucket', 54, 19); pp('table', 64, 15);
    // zona del personale
    pp('cart', 58, 32);
    pp('fusebox', 68, 23); pp('generator', 61, 25); pp('shelf', 64, 21); pp('shelf', 65, 21); pp('barrel', 68, 26); pp('crate', 61, 21);
    pp('desk', 66, 29); pp('shelf', 62, 28); pp('bucket', 68, 32); pp('crate', 61, 32);
    for (let x = 61; x <= 68; x++) pp('locker', x, 34, x % 2 ? '#4a6a8a' : '#6a4a6a'); for (let x = 63; x <= 66; x++) pp('bench', x, 36);
    for (let x = 62; x <= 65; x++) pp('camdesk', x, 40); pp('locker', 68, 43, '#5a6a7a'); pp('locker', 68, 44, '#7a4a3a'); pp('coffee', 61, 40); pp('table', 67, 41);
    pp('cot', 68, 48); pp('bucket', 61, 50);
    // fuori: lampioni, aiuole, statue, auto parcheggiate, bidoni, lettini della piscina
    for (const [x, y] of [[30, 53], [49, 53], [12, 56], [60, 53], [77, 53], [5, 14], [2, 38], [40, 2], [20, 2], [72, 14], [72, 46]]) pp('lpost', x, y);
    row('flower', 28, 36, 52); row('flower', 43, 51, 52); pp('statue', 34, 57); pp('statue', 45, 57);
    for (const [x, c] of [[58, '#2a4a7a'], [62, '#8a2a2a'], [71, '#d8d8d0'], [75, '#2a2a2e']]) two('car', x, 59, { c });
    for (const [y, c] of [[12, '#5a6a3a'], [18, '#8a7a5a'], [24, '#3a3a5a'], [46, '#7a2a2a']]) two('car', 78, y, { c });
    two('car', 3, 50, { c: '#c8b030' }); two('car', 31, 3, { c: '#4a4a52' });
    pp('bin', 44, 1); pp('bin', 45, 1); pp('bin', 48, 1); pp('crate', 50, 1); pp('crate', 51, 2); pp('barrel', 53, 1); pp('barrel', 54, 1);
    for (const y of [20, 24, 28]) pp('lounger', 8, y); pp('parasol', 8, 22); pp('parasol', 8, 26); pp('statue', 5, 35); pp('bench', 2, 25);
    // luci della notte (piano terra)
    for (const [x, y] of [[32.5, 30.5], [47, 30.5], [39.5, 47.5], [40, 43], [39.5, 26.4], [49.6, 33.5], [24.5, 13], [24.5, 30.5], [24.5, 46], [55.5, 30], [55.5, 44], [17, 12.5], [16.5, 30.5], [16, 43], [40, 15.5], [61, 12], [59, 26], [59, 38], [64, 41.5], [64.5, 23.5]]) L(x, y);
    fa = 'X'; for (const [x, y] of [[30.5, 53.5], [49.5, 53.5], [12.5, 56.5], [60.5, 53.5], [77, 53.5], [5.5, 14.5], [2.5, 38.5], [40.5, 2.5], [20.5, 2.5], [72.5, 14.5], [72.5, 46.5]]) L(x, y);
    // i 4 ingressi: furgone (due caselle, disegnato dalla casella davanti), dove ci si mette per salire e da dove si parte
    const ents = [
      { v: [68, 57], door: [39.5, 50.4], van: { x: 67.6, y: 56.4 }, ring: [[63, 55], [64, 55], [65, 55], [63, 56], [64, 56], [65, 56], [63, 57], [64, 57], [65, 57], [62, 56]] },
      { v: [68, 3], door: [60.5, 9.6], van: { x: 67.6, y: 2.4 }, ring: [[61, 4], [62, 4], [63, 4], [64, 4], [61, 5], [62, 5], [63, 5], [64, 5], [62, 6], [63, 6]] },
      { v: [7, 46], door: [11.6, 29.5], van: { x: 6.6, y: 45.4 }, ring: [[2, 42], [3, 42], [4, 42], [2, 43], [3, 43], [4, 43], [5, 43], [2, 44], [3, 44], [4, 44]] },
      { v: [77, 40], door: [68.4, 30.5], van: { x: 76.6, y: 39.4 }, ring: [[71, 37], [72, 37], [73, 37], [71, 38], [72, 38], [73, 38], [71, 39], [72, 39], [73, 39], [72, 40]] }];

    // ---------------- PRIMO PIANO ----------------
    ox = O1; fa = 'S';
    R('Galleria del primo piano', 27, 21, 26, 30, 'royal', ['#5a1e26', '#561c24'], CREAM, { nl: 1 });
    R('Atrio', 30, 27, 20, 21, 'atrium', ['#08090c', '#090a0d'], CREAM, { nl: 1 });
    R('Scalone', 37, 24, 6, 3, 'stairdn', ['#5a4a44', '#56463f'], CREAM, { nl: 1 });
    R('Ufficio del direttore', 27, 9, 12, 11, 'royal', ['#3a2a22', '#36261e'], WOOD, { ly: 18.6 }); D(32, 20, 2, 1); D(39, 14);
    R('Segreteria', 40, 9, 13, 11, 'wood', ['#6a5038', '#654c36'], WOOD, { ly: 18.6 }); D(45, 20, 2, 1); D(53, 14);
    R('Corridoio ovest', 23, 9, 3, 42, 'hcarp', COR, CREAM, { nl: 1 }); D(26, 30, 1, 2); D(26, 44, 1, 2);
    R('Corridoio est', 54, 9, 3, 42, 'hcarp', COR, CREAM, { nl: 1 }); D(53, 30, 1, 2); D(53, 44, 1, 2);
    R('Scala di servizio', 58, 44, 2, 7, 'stairs', PS, CONC, { nl: 1 }); D(57, 48, 1, 2);
    R('Ripostiglio dei piani', 61, 43, 8, 8, 'lino', ['#7a8478', '#768074'], STAFF, { ly: 50 }); D(60, 48);
    // l'ATRIO: il vuoto sopra la hall (si vede il buio, non il piano di sotto), con la balaustra intorno, i gradini che scendono e il lampadario
    for (let y = 27; y <= 47; y++) for (let x = 30; x <= 49; x++) {
      const edge = x === 30 || x === 49 || y === 27 || y === 47, step = x >= 37 && x <= 42 && y <= 30;
      pp(step ? 'vstep' : x === 39 && y === 37 ? 'chand' : edge ? 'balus' : 'void', x, y, step ? { d: y - 26 } : null);
    }
    for (const y of [24, 25, 26]) { pp('balus', 36, y); pp('balus', 43, y); }
    for (const [x, y, sd] of [[27, 24, 'w'], [52, 24, 'e'], [27, 46, 'w'], [52, 46, 'e'], [31, 9 - 0, 'n']]) pp('drape', x, y, { s: sd });
    for (const [x, y] of [[27, 21], [52, 21], [27, 50], [52, 50]]) pp('palm', x, y); pp('vase', 27, 36); pp('vase', 52, 36); pp('bench', 29, 49); pp('bench', 50, 49);
    // camere: 4 a ovest (porta a est), suite e 2 camere a est (porta a ovest). Letto, comodini, armadio con la cassaforte, scrivania, poltrona
    const room = (n, x0, y0, w, h, dy, west, c) => {
      R(n, x0, y0, w, h, 'royal', c, WOOD, { ly: y0 + h - 1.2 }); D(west ? x0 + w : x0 - 1, dy, 1, 2);
      const bxF = west ? x0 + 5 : x0 + w - 5, wx = west ? x0 : x0 + w - 1, dx = west ? x0 + w - 2 : x0 + 1;
      four('bed', bxF, y0 + 2, { c: c[0] === '#2a3a5a' ? '#c8a040' : '#8a3040', head: 'n', cano: n.startsWith('Suite') });
      pp('nstand', bxF - 2, y0 + 1); pp('nstand', bxF + 1, y0 + 1); pp('wardrobe', wx, y0 + 1); pp('safe', wx, y0 + 2);
      pp('desk', dx, y0 + h - 1); pp('armch', wx, y0 + h - 2, { c: '#6a3a2a' }); pp('palm', west ? x0 + w - 1 : x0, y0);
      pp('drape', wx, y0 + 5, { s: west ? 'w' : 'e' });
      camere.push({ n, ns: [bxF + 1 + ox, y0 + 1], sf: [wx + ox, y0 + 2], sign: [(west ? x0 + w : x0 - 1) + ox, dy] });
      return camere.length - 1;
    };
    room('Camera 101', 11, 9, 11, 10, 13, true, ['#2a3a5a', '#28385a']); room('Camera 102', 11, 20, 11, 10, 24, true, ['#4a2a3a', '#482838']);
    room('Camera 103', 11, 31, 11, 10, 35, true, ['#2a4a3a', '#284838']); room('Camera 104', 11, 42, 11, 9, 46, true, ['#4a3a2a', '#483828']);
    room('Suite presidenziale', 58, 9, 11, 13, 15, false, ['#2a3a5a', '#28385a']); room('Camera 105', 58, 23, 11, 9, 27, false, ['#4a2a3a', '#482838']);
    room('Camera 106', 58, 33, 11, 9, 37, false, ['#2a4a3a', '#284838']);
    pp('vsofa', 60, 18, { b: 's' }); pp('vsofa', 61, 18, { b: 's' }); pp('ctable', 61, 16); four('piano', 67, 20, { o: 1 }); pp('globe', 68, 15);
    // ufficio del direttore e segreteria
    pp('desk', 32, 13); pp('desk', 33, 13); pp('dchair', 33, 12, ['#5a2a1a', 'n']); row('shelf', 27, 30, 9); pp('globe', 37, 10); pp('vsofa', 36, 17, { b: 's' }); pp('vsofa', 37, 17, { b: 's' }); pp('ctable', 36, 15); pp('palm', 27, 19); pp('palm', 38, 19); pp('lamp', 38, 9);
    DC(30.2, 11.2, 5.6, 4.6, '#4a1e22'); DC(30.4, 11.4, 5.2, 0.07, '#c8a040'); DC(30.4, 15.53, 5.2, 0.07, '#c8a040');
    pp('desk', 46, 13); pp('monitor', 47, 13); pp('dchair', 46, 12, ['#3a3a5a', 'n']); row('shelf', 49, 52, 9); pp('locker', 40, 12, '#6a6050'); pp('locker', 40, 13, '#6a6050'); pp('vsofa', 42, 17, { b: 's' }); pp('vsofa', 43, 17, { b: 's' }); pp('palm', 52, 19);
    row('shelf', 61, 68, 43); pp('cart', 63, 47); pp('cart', 66, 47); pp('crate', 68, 50); pp('vase', 23, 20); pp('vase', 25, 40); pp('vase', 54, 20); pp('vase', 56, 40);
    for (const [x, y] of [[28.5, 22.5], [51.5, 22.5], [28.5, 49.5], [51.5, 49.5], [39.5, 23.6], [24.5, 20], [24.5, 40], [55.5, 20], [55.5, 40], [30, 10.5], [46, 15], [16, 12.5], [63, 13], [59.5, 46.5]]) L(x, y);

    // ---------------- INTERRATO ----------------
    ox = OI; fa = 'I';
    R('Scala antincendio', 11, 9, 2, 4, 'stairs', PS, CONC, { nl: 1 });
    R('Ripostiglio', 14, 9, 5, 4, 'concrete', ['#4e4c48', '#4a4844'], CONC, { nl: 1 }); D(16, 13);
    R('Ascensore di servizio', 20, 9, 2, 4, 'liftf', PS, CONC, { nl: 1 });
    R('Locale caldaie', 23, 9, 31, 4, 'concrete', ['#46443f', '#42403b'], CONC, { ly: 11.6 }); D(37, 13, 2, 1);
    R('Montacarichi', 55, 9, 2, 4, 'liftf', PS, CONC, { nl: 1 });
    R('Archivio', 58, 9, 11, 4, 'concrete', ['#4e4c48', '#4a4844'], CONC, { ly: 11.6 }); D(62, 13, 2, 1);
    D(11, 13, 2, 1); D(20, 13, 2, 1); D(55, 13, 2, 1);
    R('Corridoio dell\'interrato', 11, 14, 58, 2, 'concrete', ['#4c4a48', '#484644'], CONC, { nl: 1 });
    R('Lavanderia', 11, 17, 19, 11, 'tile', ['#7a8a96', '#748490'], '#3e4a52', { ly: 26 }); D(19, 16, 2, 1);
    const vault = R('Caveau', 31, 17, 18, 11, 'vault', ['#5a6068', '#565c64'], '#2a2e34', { ly: 26.6 }); D(39, 16, 2, 1);
    R('Cantina', 50, 17, 19, 11, 'stone', ['#4a4036', '#463c34'], '#3a2e26', { ly: 26 }); D(58, 16, 2, 1);
    row('shelf', 14, 18, 9); pp('crate', 18, 12);
    for (const x of [25, 29, 33, 41, 45, 49]) pp('boiler', x, 9); pp('pipe', 37, 9); pp('generator', 52, 10);
    row('boxes', 58, 68, 9); pp('crate', 68, 12);
    row('washer', 12, 17, 27); pp('rtable', 20, 21); pp('rtable', 24, 21); pp('cart', 27, 19); pp('shelf', 29, 18); pp('shelf', 29, 19); pp('bucket', 11, 17);
    pp('teca', 39, 22);
    for (const y of [18, 20, 22, 24, 26]) { pp('gold', 31, y); pp('gold', 48, y); } for (const y of [19, 21, 23, 25]) { pp('boxes', 31, y); pp('boxes', 48, y); }
    row('wine', 51, 56, 19); row('wine', 60, 66, 19); row('wine', 51, 56, 23); row('wine', 60, 66, 23); pp('barrel', 68, 26); pp('barrel', 67, 26); pp('barrel', 51, 26);
    for (const [x, y] of [[15, 14.5], [33, 15], [48, 14.5], [63, 15], [39.5, 22], [20, 22], [58, 21], [38, 11]]) L(x, y);

    // porte sbarrate: passaggi per l'interrato (porta al piano terra e porta di sotto), porta del caveau, porta della cella
    const gates = {
      sca: { d: [[13, 10, 'fdoor', { v: 1, s: 1 }], [OI + 11, 13, 'fdoor', {}], [OI + 12, 13, 'fdoor', { s: 1 }]], s: [14.5, 10.5], si: [OI + 12, 14.6], n: 'scala antincendio', e: '🚪' },
      asc: { d: [[22, 19, 'lift', { v: 1, l: 1 }], [22, 20, 'lift', { v: 1 }], [OI + 20, 13, 'lift', { l: 1 }], [OI + 21, 13, 'lift', {}]], s: [23.5, 20.0], si: [OI + 21, 14.6], n: 'ascensore di servizio', e: '🛗' },
      mon: { d: [[55, 20, 'fgate', {}], [56, 20, 'fgate', {}], [OI + 55, 13, 'fgate', {}], [OI + 56, 13, 'fgate', {}]], s: [56.0, 19.4], si: [OI + 56, 14.6], n: 'montacarichi', e: '📦' } };
    for (const k in gates) gates[k].c = gates[k].d.map(q => [q[0], q[1]]);
    for (const k in gates) for (const [x, y, t, o] of gates[k].d) props.push([t, x, y, o]);
    const vdoor = { d: [[OI + 39, 16, 'bdoor', { part: 1 }], [OI + 40, 16, 'bdoor', {}]], s: [OI + 40, 15.5], kl: [OI + 38.5, 15.5], kr: [OI + 41.5, 15.5] };
    vdoor.c = vdoor.d.map(q => [q[0], q[1]]); for (const [x, y, t, o] of vdoor.d) props.push([t, x, y, o]);
    const cdoor = { d: [[65, 46, 'cdoor', {}], [66, 46, 'cdoor', {}]] }; cdoor.c = cdoor.d.map(q => [q[0], q[1]]);
    const teca = { x: OI + 39, y: 22 };

    // PASSAGGI tra i piani: caselle dove si entra (cells), piano di arrivo (tf), dove si arriva (to: tiene lo spostamento di lato sullo scalone)
    const cellsOf = (x0, x1, y0, y1) => { const a = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) a.push([x, y]); return a; };
    const portals = [
      { k: 'scalone', n: 'lo scalone', f: 0, tf: 1, cells: cellsOf(37, 42, 24, 24), to: x => [x + O1, 23.4] },
      { k: 'scalone', n: 'lo scalone', f: 1, tf: 0, cells: cellsOf(O1 + 37, O1 + 42, 26, 26), to: x => [x - O1, 26.6] },
      { k: 'servizio', n: 'la scala di servizio', f: 0, tf: 1, cells: cellsOf(58, 59, 49, 50), to: x => [x + O1, 48.6] },
      { k: 'servizio', n: 'la scala di servizio', f: 1, tf: 0, cells: cellsOf(O1 + 58, O1 + 59, 44, 45), to: x => [x - O1, 46.8] },
      { k: 'sca', n: 'la scala antincendio', f: 0, tf: 2, cells: cellsOf(11, 11, 9, 11), to: () => [OI + 11.9, 11.8] },
      { k: 'sca', n: 'la scala antincendio', f: 2, tf: 0, cells: cellsOf(OI + 11, OI + 12, 9, 10), to: () => [12.5, 10.5] },
      { k: 'asc', n: 'l\'ascensore di servizio', f: 0, tf: 2, cells: cellsOf(20, 20, 19, 20), to: () => [OI + 20.9, 11.8] },
      { k: 'asc', n: 'l\'ascensore di servizio', f: 2, tf: 0, cells: cellsOf(OI + 20, OI + 21, 9, 10), to: () => [21.5, 20.0] },
      { k: 'mon', n: 'il montacarichi', f: 0, tf: 2, cells: cellsOf(55, 56, 22, 22), to: () => [OI + 55.9, 11.8] },
      { k: 'mon', n: 'il montacarichi', f: 2, tf: 0, cells: cellsOf(OI + 55, OI + 56, 9, 10), to: () => [56.0, 21.4] }];
    const PORT = new Uint8Array(W * H); portals.forEach((p, i) => { for (const [x, y] of p.cells) PORT[y * W + x] = i + 1; });
    // SCALONE: gradini veri (altezze del motore), dalla hall sale verso nord fino al pianerottolo sotto l'arco
    const hz = []; for (let y = 0; y < H; y++) hz.push(new Uint8Array(W));
    for (let y = 24; y <= 33; y++) for (let x = 37; x <= 42; x++) hz[y][x] = Math.min(6, 34 - y);

    // telecamere (su un palo, o appese al muro se p = null): angolo di partenza a0, quanto girano sw, periodo per
    const cams = [
      { x: 27.0, y: 24.6, p: null, a0: Math.atan2(1, 1), sw: 0.6, per: 9, r: 10, h: 0.4 },
      { x: 24.5, y: 9.4, p: null, a0: Math.PI / 2, sw: 0.2, per: 8, r: 11, h: 0.34 },
      { x: 55.5, y: 50.6, p: null, a0: -Math.PI / 2, sw: 0.25, per: 8, r: 11, h: 0.36 },
      { x: 37.5, y: 52.4, p: null, a0: Math.PI / 2, sw: 0.8, per: 10, r: 8, h: 0.4 },
      { x: O1 + 27.4, y: 21.4, p: null, a0: Math.atan2(1, 1), sw: 0.5, per: 9, r: 11, h: 0.38 },
      { x: O1 + 52.6, y: 50.6, p: null, a0: Math.atan2(-1, -1), sw: 0.5, per: 10, r: 11, h: 0.38 },
      { x: OI + 11.4, y: 14.6, p: null, a0: 0, sw: 0.2, per: 8, r: 11, h: 0.34 },
      { x: OI + 68.6, y: 15.4, p: null, a0: Math.PI, sw: 0.2, per: 9, r: 11, h: 0.34 }];
    cams.forEach(c => { if (c.p) props.push(['hcam', c.p[0], c.p[1]]); });
    // posti dove frugare (x, y = l'oggetto della mappa)
    const SP = {
      giacca: { n: 'giacca del direttore', x: 16, y: 47, i: '🧥' }, recep: { n: 'cassetto della reception', x: 49, y: 33, i: '🗄️' }, custode: { n: 'scrivania del custode', x: 66, y: 29, i: '🗄️' },
      armad: { n: 'armadietto dello chef', x: 62, y: 34, i: '🚪' }, bcuc: { n: 'bancone della cucina', x: 58, y: 14, i: '🍳' }, postit: { n: 'scrivania del direttore', x: O1 + 32, y: 13, i: '📝' },
      agenda: { n: 'agenda della segretaria', x: O1 + 46, y: 13, i: '📒' }, monit: { n: 'monitor della sicurezza', x: 63, y: 40, i: '📺' }, bicch: { n: 'bancone del bar', x: 16, y: 11, i: '🥃' },
      tazz: { n: 'tazzina del direttore', x: O1 + 33, y: 13, i: '☕' }, kUff: { n: 'scaffale dell\'ufficio', x: O1 + 27, y: 9, i: '📚' }, kSpo: { n: 'armadietto dello spogliatoio', x: 67, y: 34, i: '🚪' },
      kCus: { n: 'scaffale del custode', x: 62, y: 28, i: '📚' }, kLav: { n: 'lavatrice', x: OI + 13, y: 27, i: '🧺' }, kCan: { n: 'scaffale dei vini', x: OI + 60, y: 19, i: '🍷' },
      vetr: { n: 'vetrina della boutique', x: 14, y: 43, i: '💎' }, comod: { n: 'comodino del direttore', x: 0, y: 0, i: '🛏️' }, safe: { n: 'cassaforte della camera', x: 0, y: 0, i: '🔒' },
      conf: { n: 'armadio delle confische', x: 68, y: 44, i: '📦' }, quadro: { n: 'quadro elettrico', x: 68, y: 23, i: '⚡' } };
    // guardie: giri di ronda [x, y, attesa, dove guarda]; alcune salgono e scendono lo scalone
    const routes = {
      cella: { post: 1, n: 'carceriere', route: [[63.5, 42.5, 4, 0], [66.5, 44.5, 3, 1.57], [62.5, 44.5, 3, 1.57], [65.5, 41.5, 3, -1.57]] },
      hall: { route: [[35.5, 40.5, 2, 1.57], [28.5, 28.5, 2, 0], [39.5, 26.4, 3, 1.57], [50.5, 38.5, 2, 3.14], [45.5, 47.5, 2, -1.57], [24.5, 20.5, 1.5, 1.57]] },
      primo: { route: [[O1 + 33.5, 22.5, 2, -1.57], [O1 + 33.5, 15.5, 2, 0], [O1 + 46.5, 15.5, 2, 3.14], [O1 + 51.5, 35.5, 2, 3.14], [O1 + 39.5, 49.5, 2, -1.57], [O1 + 28.5, 35.5, 2, 0]] },
      interrato: { route: [[OI + 14.5, 14.5, 2, 0], [OI + 40.5, 15.0, 3, 1.57], [OI + 64.5, 14.5, 2, 3.14], [OI + 60.5, 21.5, 2, 3.14], [OI + 39.5, 15.0, 2, 1.57], [OI + 20.5, 22.5, 2, 0], [OI + 38.5, 11.5, 2, 1.57]] },
      servizio: { route: [[58.5, 22.5, 2, 1.57], [60.5, 16.5, 2, 3.14], [58.5, 41.5, 2, -1.57], [64.5, 24.5, 2, 1.57], [55.5, 35.5, 2, 3.14], [64.5, 30.5, 2, 0]] },
      camere: { route: [[O1 + 24.5, 10.5, 2, 1.57], [O1 + 24.5, 40.5, 1.5, 1.57], [O1 + 28.5, 48.5, 1, 0], [O1 + 55.5, 46.5, 1.5, -1.57], [O1 + 55.5, 10.5, 2, 1.57], [O1 + 50.5, 22.5, 1, 3.14]] },
      ovest: { route: [[24.5, 10.5, 2, 1.57], [16.5, 13.5, 2, 0], [16.5, 31.5, 2, 0], [24.5, 49.5, 2, -1.57], [16.5, 44.5, 1.5, 0], [40.5, 16.5, 2, 1.57]] },
      esterno: { route: [[39.5, 55.5, 2, -1.57], [6.5, 47.5, 2, -1.57], [2.5, 4.5, 2, 0], [66.5, 5.5, 2, 1.57], [73.5, 30.5, 2, 3.14], [70.5, 56.5, 2, 3.14]] } };
    // per ogni casella: le caselle in luce (lampade per ala) e la stanza
    const LITC = new Uint8Array(W * H), AI = { S: 1, T: 2, I: 3, X: 4 };
    for (const [lx, ly, a] of lamps) for (let y = Math.floor(ly - LAMP_R); y <= ly + LAMP_R; y++) for (let x = Math.floor(lx - LAMP_R); x <= lx + LAMP_R; x++) if (x >= 0 && y >= 0 && x < W && y < H && Math.hypot(x + 0.5 - lx, y + 0.5 - ly) < LAMP_R) LITC[y * W + x] = AI[a];
    const ri = (x, y) => { for (let i = rooms.length - 1; i >= 0; i--) { const r = rooms[i]; if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i; } return -1; };
    const ROOM = new Int16Array(W * H).fill(-1); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ROOM[y * W + x] = ri(x, y);
    for (const [hx, hy, hw, hh] of holes) for (let y = hy; y < hy + hh; y++) for (let x = hx; x < hx + hw; x++) ROOM[y * W + x] = -1;
    // porte: la stanza accanto (prima quella sopra o a sinistra, mai la galleria se c'e' altro)
    for (const [x0, y0, w, h] of doors) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      let a = -1; for (const [dx, dy] of [[0, -1], [-1, 0], [0, 1], [1, 0]]) { const r = ri(x + dx, y + dy); if (r >= 0 && !holes.some(([hx, hy, hw, hh]) => x + dx >= hx && x + dx < hx + hw && y + dy >= hy && y + dy < hy + hh)) { a = r; if (rooms[r].ala !== 'X') break; } }
      ROOM[y * W + x] = a;
    }
    // NASCONDIGLI: armadi, sotto i letti, tende, cappotti del guardaroba, armadietti dello spogliatoio, carrelli della biancheria (non quelli dove si fruga)
    const HN = { wardrobe: ['🚪', 'nell\'armadio'], bed: ['🛏️', 'sotto il letto'], drape: ['🎭', 'dietro la tenda'], coats: ['🧥', 'tra i cappotti'], locker: ['🚪', 'nell\'armadietto'], cart: ['🧺', 'nel carrello della biancheria'] };
    const HS = [];
    for (const [t, x, y, o] of props) { if (!HN[t] || (o && o.part)) continue; if (t === 'locker' && !(y === 34 && x !== 62 && x !== 67)) continue; if (t === 'coats' && x === 16) continue; HS.push({ x, y, t, e: HN[t][0], n: HN[t][1] }); }
    const jail = [[62.5, 48.5], [64.5, 48.5], [66.5, 49.5], [63.5, 49.6], [65.5, 47.5], [62.5, 47.5]], cellOut = [66.0, 45.3];
    return { w: W, h: H, rooms, doors, decals, props, holes, tasks: [], hall: gal, cams: [], vending: [], ring: ents[0].ring, button: { x: -10, y: -10 }, sabs: {}, inn: {}, help: '', btnTxt: '', sabTxt: '',
      deco, draw, floor: FLOOR, decoDraw, drawWall, bg: () => '#07080b', hz, hb: 0.3, hzSide, bgSc: 1.5,
      hcams: cams, SP, routes, lamps, LITC, ROOM, gates, vdoor, cdoor, teca, jail, cellOut, camere, cellRoom: cell, vaultRoom: vault, portals, PORT, ents, jailIco: [64.5, 48.5], HS };
  }
  const roomAt = (x, y) => { const M = MP(), xi = Math.floor(x), yi = Math.floor(y); return xi < 0 || yi < 0 || xi >= W || yi >= H ? -1 : M.ROOM[yi * W + xi]; };
  const alaAt = (x, y) => { const r = roomAt(x, y); return r >= 0 ? MP().rooms[r].ala : null; };
  const darkAt = (G, x, y) => { const a = alaAt(x, y); return !!(a && a !== 'X' && G.dk && G.time < (G.dk[a] || 0)); };
  const litAt = (G, x, y) => { const xi = Math.floor(x), yi = Math.floor(y); if (xi < 0 || yi < 0 || xi >= W || yi >= H) return false; const a = MP().LITC[yi * W + xi]; if (!a) return false; const k = 'STIX'[a - 1]; return k === 'X' || !(G.time < (G.dk[k] || 0)); };
  const inRoom = (x, y, i) => { const r = MP().rooms[i]; return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; };
  // passaggio tra i piani nella casella x, y (o null)
  const portalAt = (x, y) => { const M = MP(), xi = Math.floor(x), yi = Math.floor(y); if (xi < 0 || yi < 0 || xi >= W || yi >= H || !M.PORT) return null; const i = M.PORT[yi * W + xi]; return i ? M.portals[i - 1] : null; };
  // PERCORSO anche tra piani diversi: fino alla casella del passaggio, poi dall'arrivo alla meta (dal primo piano all'interrato si passa dal piano terra).
  // Il passaggio scelto e' quello col percorso piu' corto; se una porta e' chiusa quel passaggio non si raggiunge e si salta.
  function route(sx, sy, ex, ey) {
    const a = floorOf(sx), b = floorOf(ex);
    if (a === b) return cqPath(sx, sy, ex, ey);
    const hop = a === 0 ? b : 0; let best = null;
    for (const Pq of MP().portals) {
      if (Pq.f !== a || Pq.tf !== hop) continue;
      let c = Pq.cells[0], cd = 1e9; for (const q of Pq.cells) { const d = Math.hypot(q[0] + 0.5 - sx, q[1] + 0.5 - sy); if (d < cd) { cd = d; c = q; } }
      const p1 = cqPath(sx, sy, c[0] + 0.5, c[1] + 0.5); if (!p1.length && cd > 0.8) continue;
      const [ax, ay] = Pq.to(c[0] + 0.5, c[1] + 0.5), p2 = route(ax, ay, ex, ey); if (!p2.length && Math.hypot(ax - ex, ay - ey) > 0.8) continue;
      if (!p1.length) p1.push([c[0] + 0.5, c[1] + 0.5]);
      const n = p1.length + p2.length; if (!best || n < best.n) best = { n, p: p1.concat(p2) };
    }
    return best ? best.p : [];
  }
  // guardie e ladri del computer: passano dal passaggio solo se il loro percorso continua dall'altra parte
  function npcTp(c) {
    const Pq = portalAt(c.x, c.y); if (!Pq || !c.path || !c.path.some(q => floorOf(q[0]) === Pq.tf)) return false;
    const [x, y] = Pq.to(c.x, c.y); c.x = x; c.y = y; while (c.path.length && floorOf(c.path[0][0]) !== Pq.tf) c.path.shift(); return true;
  }

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
    marble(K, x, y) {   // marmo della hall a scacchi bianchi e neri con le venature
      const Pp = (u, v) => K.S(x + u, y + v, 0), dk = (x + y) % 2; K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], dk ? '#2e2a2c' : '#e2dccf');
      if (K.TW < 40) return; const a = K.hsh(x, y, 5), b = K.hsh(x, y, 6);
      K.strokes([[Pp(0.1, a), Pp(0.5, b)], [Pp(0.5, b), Pp(0.9, (a + b) / 2)]], dk ? 'rgba(200,190,180,.18)' : 'rgba(120,110,95,.25)');
      K.strokes([[Pp(0.03, 0.03), Pp(0.97, 0.03)], [Pp(0.03, 0.03), Pp(0.03, 0.97)]], 'rgba(255,255,255,.16)');
    },
    parq(K, x, y) {   // parquet a spina di pesce
      if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0), L = [];
      if ((x + y) % 2) for (const u of [0.25, 0.5, 0.75]) L.push([Pp(u, 0), Pp(u, 1)]); else for (const v of [0.25, 0.5, 0.75]) L.push([Pp(0, v), Pp(1, v)]);
      K.strokes(L, 'rgba(0,0,0,.2)'); K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)]], 'rgba(255,230,190,.08)');
    },
    royal(K, x, y) {   // moquette con il disegno dorato (camere, uffici, galleria)
      if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0);
      K.poly([Pp(0.5, 0.22), Pp(0.78, 0.5), Pp(0.5, 0.78), Pp(0.22, 0.5)], 'rgba(200,160,64,.16)'); K.dot(x + 0.5, y + 0.5, 0, 0.04, 'rgba(230,190,90,.35)');
      K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0), Pp(0, 1)]], 'rgba(0,0,0,.1)');
    },
    tile2(K, x, y) {   // piastrelle a scacchi piccoli bianche e nere
      const Pp = (u, v) => K.S(x + u, y + v, 0);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) K.poly([Pp(i / 2, j / 2), Pp(i / 2 + 0.5, j / 2), Pp(i / 2 + 0.5, j / 2 + 0.5), Pp(i / 2, j / 2 + 0.5)], '#2a2a2e');
    },
    lino(K, x, y) { if (K.TW < 40) return; K.speck(x, y, 3, ['rgba(255,255,255,.1)', 'rgba(0,0,0,.12)'], K.TW / 24); },
    paving(K, x, y) {   // lastre di pietra del viale
      if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0), o = y % 2 ? 0.5 : 0;
      K.strokes([[Pp(0, 0), Pp(1, 0)], [Pp(0, 0.5), Pp(1, 0.5)], [Pp(o, 0), Pp(o, 0.5)], [Pp((o + 0.5) % 1, 0.5), Pp((o + 0.5) % 1, 1)]], 'rgba(0,0,0,.22)');
    },
    pooltile(K, x, y) { if (K.TW < 40) return; const Pp = (u, v) => K.S(x + u, y + v, 0); K.strokes([[Pp(0, 0.5), Pp(1, 0.5)], [Pp(0.5, 0), Pp(0.5, 1)]], 'rgba(255,255,255,.25)'); },
    atrium(K, x, y) { const Pp = (u, v) => K.S(x + u, y + v, 0); K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], '#060709'); },
    stairc(K, x, y) {   // gradino dello scalone: marmo con la passatoia rossa e la bacchetta d'ottone
      const Pp = (u, v) => K.S(x + u, y + v, 0), side = x === 37 || x === 42;
      K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], side ? '#e4dccb' : (x + y) % 2 ? '#7a1e22' : '#7e2024');
      if (!side) { if (x === 38) K.strokes([[Pp(0.1, 0), Pp(0.1, 1)]], '#c8a040', Math.max(1.5, K.TW / 26)); if (x === 41) K.strokes([[Pp(0.9, 0), Pp(0.9, 1)]], '#c8a040', Math.max(1.5, K.TW / 26)); }
      if (y >= 28) K.strokes([[Pp(0, 0.96), Pp(1, 0.96)]], side ? 'rgba(120,110,95,.4)' : '#d8b44a', Math.max(1.5, K.TW / 22));
    },
    stairdn(K, x, y) {   // in cima allo scalone (primo piano): i gradini scendono verso il buio
      const Pp = (u, v) => K.S(x + u, y + v, 0), d = y - 24, side = x === O1 + 37 || x === O1 + 42;
      K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], cqShade(side ? '#cfc6b4' : '#7a1e22', 1 - d * 0.22));
      K.strokes([[Pp(0, 0.5), Pp(1, 0.5)], [Pp(0, 0.98), Pp(1, 0.98)]], 'rgba(0,0,0,.35)', Math.max(1.5, K.TW / 22));
    },
    vault(K, x, y) {   // lastre d'acciaio con i rivetti
      const Pp = (u, v) => K.S(x + u, y + v, 0); K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], (x + y) % 2 ? '#565c64' : '#5c626a');
      if (K.TW < 40) return; K.strokes([[Pp(0, 0.02), Pp(1, 0.02)], [Pp(0.02, 0), Pp(0.02, 1)]], 'rgba(0,0,0,.25)');
      for (const [u, v] of [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]) K.dot(x + u, y + v, 0, 0.03, '#7a8088');
    },
    stairs(K, x, y) {   // gradini di servizio
      const Pp = (u, v) => K.S(x + u, y + v, 0); K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], '#4a4846');
      const L = []; for (let i = 0; i < 4; i++) L.push([Pp(0, i / 4 + 0.05), Pp(1, i / 4 + 0.05)]); K.strokes(L, '#2e2c2a', Math.max(2, K.TW / 18));
      K.strokes([[Pp(0, 0.5), Pp(1, 0.5)]], 'rgba(200,190,170,.15)');
    },
    liftf(K, x, y) {   // pavimento di lamiera a rombi
      const Pp = (u, v) => K.S(x + u, y + v, 0); K.poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], '#5a5c5e');
      if (K.TW < 40) return; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) K.dot(x + 0.2 + i * 0.3, y + 0.2 + j * 0.3, 0, 0.035, '#76787a');
    }
  };
  // fianchi dello scalone: marmo, piu' chiaro in cima
  const hzSide = (x, y, i) => i ? '#e6dece' : '#cdc4b2';
  function decoDraw() {}
  // MURI: boiserie (legno in basso, stucco crema, cornice dorata), legno, muri del personale, cemento; fuori siepi e mattoni; l'ARCO in cima allo scalone
  function drawWall(K, x, y, col) {
    const { bx, qL, strokes, S } = K, TW = K.TW;
    if (y === 23 && x >= 37 && x <= 42) {   // arco dorato in cima allo scalone: dentro il buio del passaggio verso il primo piano
      const pil = x === 37 || x === 42;
      bx(x, y, x + 1, y + 1, 0, pil ? 3.0 : 1.8, '#d8cdb4');
      if (!pil) { qL(x, x + 1, y + 1, 1.8, 2.6, '#0d0b0e'); bx(x, y, x + 1, y + 1, 2.6, 3.0, '#d8cdb4'); qL(x, x + 1, y + 1, 2.6, 2.66, '#c8a040'); }
      else { qL(x + 0.15, x + 0.85, y + 1, 0.2, 2.8, '#e6dccb'); qL(x + 0.1, x + 0.9, y + 1, 2.8, 2.9, '#c8a040'); }
      return;
    }
    const facade = floorOf(x) === 0 && (y === 51 || x === 69 || (x === 10 && y > 7) || y === 8) && x >= 10 && x <= 69;
    if (facade) {   // facciata di pietra chiara con lo zoccolo e le finestre (accese o buie)
      bx(x, y, x + 1, y + 1, 0, 1.15, '#d6ccb6'); bx(x, y, x + 1, y + 1, 1.05, 1.15, '#e8e0cc');
      if (TW >= 40) { qL(x, x + 1, y + 1, 0, 0.18, '#a89e88'); if ((x + y) % 3 === 0) qL(x + 0.25, x + 0.75, y + 1, 0.4, 0.95, K.hsh(x, y, 3) < 0.3 ? '#e8c878' : '#2a3040'); }
      return;
    }
    const edge = floorOf(x) === 0 && (x === 0 || x === 79 || y === 0 || y === 61);
    if (col === HEDGE || edge) {   // siepe squadrata
      bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0, 0.85, '#2f5a2e'); if (TW >= 40) for (let i = 0; i < 4; i++) K.dot(x + 0.2 + 0.6 * K.hsh(x, y, i), y + 0.95, 0.2 + 0.6 * K.hsh(x, y, i + 9), 0.035, '#3f7a3a');
      return;
    }
    if (col === BRICK) { bx(x, y, x + 1, y + 1, 0, 1.0, '#6a3a2e'); if (TW >= 40) { const L = []; for (const z of [0.25, 0.5, 0.75]) L.push([S(x, y + 1, z), S(x + 1, y + 1, z)], [S(x + 1, y + 1, z), S(x + 1, y, z)]); strokes(L, 'rgba(0,0,0,.25)'); } return; }
    if (col === CREAM) {   // stucco crema con la boiserie in basso e la cornice d'oro
      bx(x, y, x + 1, y + 1, 0, 0.36, '#5a3a24'); bx(x, y, x + 1, y + 1, 0.36, 0.9, '#cbbb98'); bx(x, y, x + 1, y + 1, 0.84, 0.92, '#e2d6b8');
      if (TW >= 40) strokes([[S(x, y + 1, 0.37), S(x + 1, y + 1, 0.37)], [S(x + 1, y + 1, 0.37), S(x + 1, y, 0.37)]], '#c8a040', Math.max(1.5, TW / 30));
      return;
    }
    if (col === WOOD) { bx(x, y, x + 1, y + 1, 0, 0.9, '#5a3c26'); bx(x, y, x + 1, y + 1, 0.84, 0.92, '#7a5236'); if (TW >= 40) { const L = []; for (const u of [0.33, 0.66]) L.push([S(x + u, y + 1, 0.05), S(x + u, y + 1, 0.82)]); strokes(L, 'rgba(0,0,0,.25)'); } return; }
    bx(x, y, x + 1, y + 1, 0, 0.9, col); bx(x, y, x + 1, y + 1, 0.82, 0.9, cqShade(col, 1.3));
  }
  // porta in un varco del muro: lastra in piedi a meta' della casella (v = varco in un muro verticale)
  const slab = (K, x, y, v, z, col) => v ? K.bx(x + 0.38, y, x + 0.62, y + 1, 0, z, col) : K.bx(x, y + 0.38, x + 1, y + 0.62, 0, z, col);
  function draw(K, t, x, y, o) {
    const { bx, cyl, dot, glow, line, S, poly, qL } = K, g = K.g, TW = K.TW;
    o = o || {};
    switch (t) {
      case 'bed': {   // letto matrimoniale 2x2, disegnato dalla casella davanti (cano = a baldacchino)
        if (o.part) break; const x0 = x - 1, y0 = y - 1, n = o.head === 'n';
        bx(x0 + 0.08, y0 + 0.08, x + 0.92, y + 0.92, 0, 0.38, '#5a3a24');
        bx(x0 + 0.12, y0 + 0.12, x + 0.88, y + 0.88, 0.38, 0.55, '#ece6da');
        if (n) { bx(x0 + 0.12, y0 + 0.75, x + 0.88, y + 0.88, 0.55, 0.62, o.c); bx(x0 + 0.08, y0 + 0.02, x + 0.92, y0 + 0.14, 0, 1.15, '#4a2e1c'); for (const u of [0.3, 1.1]) bx(x0 + u, y0 + 0.2, x0 + u + 0.55, y0 + 0.55, 0.55, 0.7, '#f6f2ea'); }
        else { bx(x0 + 0.12, y0 + 0.12, x + 0.88, y + 0.25, 0.55, 0.62, o.c); for (const u of [0.3, 1.1]) bx(x0 + u, y + 0.45, x0 + u + 0.55, y + 0.8, 0.55, 0.7, '#f6f2ea'); bx(x0 + 0.08, y + 0.86, x + 0.92, y + 0.98, 0, 1.15, '#4a2e1c'); }
        bx(x0 + 0.12, y0 + 1.3, x + 0.88, y0 + 1.55, 0.62, 0.64, '#c8a040');
        if (o.cano) { for (const [a, b] of [[0.1, 0.1], [1.8, 0.1], [0.1, 1.8], [1.8, 1.8]]) bx(x0 + a, y0 + b, x0 + a + 0.1, y0 + b + 0.1, 0, 2.1, '#4a2e1c'); bx(x0 + 0.08, y0 + 0.08, x + 0.92, y + 0.92, 2.0, 2.15, '#7a1e2e'); qL(x0 + 0.1, x + 0.9, y + 0.92, 1.8, 2.0, '#8a2a3a'); }
        break; }
      case 'nstand': bx(x + 0.2, y + 0.2, x + 0.8, y + 0.8, 0, 0.55, '#6a4a30'); qL(x + 0.25, x + 0.75, y + 0.8, 0.25, 0.27, '#3a2818'); cyl(x + 0.5, y + 0.45, 0.06, 0.55, 0.8, '#c8b48a'); cyl(x + 0.5, y + 0.45, 0.2, 0.8, 1.05, '#f2e2b8'); glow(x + 0.5, y + 0.45, 0.95, 1.1, 'rgba(255,220,150,.35)'); break;
      case 'wardrobe': bx(x + 0.08, y + 0.1, x + 0.92, y + 0.9, 0, 1.9, '#6a4a30'); qL(x + 0.12, x + 0.49, y + 0.9, 0.1, 1.8, '#74523a'); qL(x + 0.51, x + 0.88, y + 0.9, 0.1, 1.8, '#74523a'); dot(x + 0.45, y + 0.9, 1.0, 0.025, '#d8c070'); dot(x + 0.55, y + 0.9, 1.0, 0.025, '#d8c070'); break;
      case 'safe': bx(x + 0.18, y + 0.2, x + 0.82, y + 0.8, 0, 0.7, '#3a3e44'); qL(x + 0.24, x + 0.76, y + 0.8, 0.08, 0.62, '#4a4f56'); dot(x + 0.5, y + 0.8, 0.36, 0.08, '#8a8e94'); dot(x + 0.5, y + 0.8, 0.36, 0.03, '#2a2a2a'); break;
      case 'cot': bx(x + 0.15, y + 0.05, x + 0.85, y + 0.95, 0, 0.35, '#5a5e64'); bx(x + 0.18, y + 0.08, x + 0.82, y + 0.92, 0.35, 0.45, '#8a8470'); break;
      case 'rtable': cyl(x + 0.5, y + 0.5, 0.06, 0, 0.72, '#2a2a2a'); cyl(x + 0.5, y + 0.5, 0.4, 0.72, 0.8, '#e8e2d4'); dot(x + 0.45, y + 0.45, 0.82, 0.05, '#c8a040'); break;
      case 'dtable':   // tavolo tondo del ristorante: tovaglia bianca fino a terra, piatti, candela accesa
        cyl(x + 0.5, y + 0.5, 0.42, 0, 0.74, '#ece8e0'); cyl(x + 0.5, y + 0.5, 0.44, 0.74, 0.78, '#f6f2ea');
        for (const [a, b] of [[0.3, 0.5], [0.7, 0.5], [0.5, 0.3], [0.5, 0.7]]) dot(x + a, y + b, 0.79, 0.07, '#ffffff');
        cyl(x + 0.5, y + 0.5, 0.025, 0.78, 1.0, '#f2ecd8'); dot(x + 0.5, y + 0.5, 1.04, 0.03, '#ffd27a'); dot(x + 0.5, y + 0.5, 1.05, 0.012, '#fff6d8'); break;
      case 'coats': bx(x + 0.1, y + 0.1, x + 0.9, y + 0.2, 0, 1.75, '#4a3a2a'); for (let i = 0; i < 3; i++) { const c = ['#2a2a32', '#5a2a2a', '#3a4a3a'][(i + x + y) % 3]; bx(x + 0.15 + i * 0.25, y + 0.2, x + 0.35 + i * 0.25, y + 0.45, 0.6, 1.6, c); } break;
      case 'vitrine': bx(x + 0.08, y + 0.1, x + 0.92, y + 0.9, 0, 0.7, '#5a4a3a'); bx(x + 0.12, y + 0.14, x + 0.88, y + 0.86, 0.7, 0.72, '#8ab8c8'); for (let i = 0; i < 3; i++) dot(x + 0.25 + i * 0.25, y + 0.5, 0.78, 0.04, ['#e8f4ff', '#f2c84a', '#d84a7a'][i]);
        line(S(x + 0.12, y + 0.86, 0.72), S(x + 0.12, y + 0.86, 1.25), '#c8e0e8', 1); line(S(x + 0.88, y + 0.86, 0.72), S(x + 0.88, y + 0.86, 1.25), '#c8e0e8', 1); line(S(x + 0.12, y + 0.86, 1.25), S(x + 0.88, y + 0.86, 1.25), '#c8e0e8', 1); line(S(x + 0.88, y + 0.14, 1.25), S(x + 0.88, y + 0.86, 1.25), '#c8e0e8', 1); break;
      case 'washer': bx(x + 0.1, y + 0.12, x + 0.9, y + 0.88, 0, 1.0, '#e4e8ec'); dot(x + 0.5, y + 0.88, 0.5, 0.17, '#3a4a5a'); dot(x + 0.5, y + 0.88, 0.5, 0.11, '#6a8aa8'); qL(x + 0.15, x + 0.85, y + 0.88, 0.85, 0.95, '#b8c0c8'); break;
      case 'wine': bx(x + 0.05, y + 0.25, x + 0.95, y + 0.75, 0, 1.9, '#4a3020'); for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) dot(x + 0.22 + i * 0.28, y + 0.75, 0.3 + r * 0.42, 0.055, (r + i + x) % 3 ? '#2a1a2a' : '#3a5a2a'); break;
      case 'gold': bx(x + 0.1, y + 0.15, x + 0.9, y + 0.85, 0, 0.9, '#3a3e44'); for (let r = 0; r < 2; r++) for (let i = 0; i < 2; i++) bx(x + 0.18 + i * 0.36, y + 0.3, x + 0.48 + i * 0.36, y + 0.7, 0.9 + r * 0.14, 1.02 + r * 0.14, '#e8b830'); glow(x + 0.5, y + 0.5, 1.1, 0.9, 'rgba(255,210,90,.25)'); break;
      case 'boxes': bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0, 1.8, '#6a7078'); for (let r = 0; r < 4; r++) for (let i = 0; i < 2; i++) { qL(x + 0.12 + i * 0.4, x + 0.48 + i * 0.4, y + 0.95, 0.1 + r * 0.42, 0.45 + r * 0.42, '#8a9098'); dot(x + 0.3 + i * 0.4, y + 0.95, 0.28 + r * 0.42, 0.02, '#2a2a2a'); } break;
      case 'column': cyl(x + 0.5, y + 0.5, 0.42, 0, 0.18, '#b8b0a0'); cyl(x + 0.5, y + 0.5, 0.32, 0.18, 2.25, '#e0d8c8'); cyl(x + 0.5, y + 0.5, 0.42, 2.25, 2.45, '#c8a040'); break;
      case 'pipe': bx(x + 0.3, y + 0.3, x + 0.7, y + 0.7, 0, 1.8, '#6a5a4a'); cyl(x + 0.5, y + 0.5, 0.25, 0.4, 0.6, '#c8402a'); break;
      case 'hcam': cyl(x + 0.5, y + 0.5, 0.05, 0, 1.75, '#3a3e44'); bx(x + 0.3, y + 0.3, x + 0.62, y + 0.55, 1.65, 1.88, '#d8dce0'); dot(x + 0.35, y + 0.35, 1.78, 0.045, '#1a1a1a'); break;
      case 'cdoor': {   // sbarre della cella
        const v = o.v, L2 = []; for (let i = 1; i < 6; i++) { const u = i / 6; L2.push(v ? [S(x + 0.5, y + u, 0), S(x + 0.5, y + u, 1.7)] : [S(x + u, y + 0.5, 0), S(x + u, y + 0.5, 1.7)]); }
        K.strokes(L2, '#8a9098', Math.max(2, TW / 14)); slab(K, x, y, v, 0.08, '#5a6068'); v ? bx(x + 0.42, y, x + 0.58, y + 1, 1.62, 1.75, '#5a6068') : bx(x, y + 0.42, x + 1, y + 0.58, 1.62, 1.75, '#5a6068'); break; }
      case 'fdoor':   // porta tagliafuoco rossa (s = col cartello verde dell'uscita)
        slab(K, x, y, o.v, 1.75, '#a8322a'); if (o.v) bx(x + 0.36, y + 0.1, x + 0.64, y + 0.9, 0.8, 0.9, '#d8d8d0'); else qL(x + 0.1, x + 0.9, y + 0.62, 0.8, 0.9, '#d8d8d0');
        if (o.s) { o.v ? bx(x + 0.4, y + 0.3, x + 0.6, y + 0.7, 1.9, 2.15, '#2a8a4a') : bx(x - 0.4, y + 0.5, x + 0.4, y + 0.62, 1.9, 2.15, '#2a8a4a'); glow(x + (o.v ? 0.5 : 0), y + 0.6, 2.0, 0.8, 'rgba(90,255,140,.35)'); } break;
      case 'lift':   // porta dell'ascensore: due ante d'acciaio con la cornice d'ottone (l = anta sinistra con i pulsanti)
        slab(K, x, y, o.v, 1.8, '#9aa2aa');
        if (o.v) { bx(x + 0.36, y + (o.l ? 0 : 0.95), x + 0.64, y + (o.l ? 0.05 : 1), 0, 1.85, '#c8a040'); if (o.l) { bx(x + 0.3, y + 0.15, x + 0.36, y + 0.35, 0.9, 1.25, '#2a2e34'); dot(x + 0.33, y + 0.25, 1.15, 0.03, '#f2c84a'); } }
        else { qL(x + (o.l ? 0 : 0.95), x + (o.l ? 0.05 : 1), y + 0.62, 0, 1.85, '#c8a040'); if (!o.l) { bx(x + 0.15, y + 0.55, x + 0.35, y + 0.65, 0.9, 1.25, '#2a2e34'); dot(x + 0.25, y + 0.66, 1.15, 0.03, '#f2c84a'); dot(x + 0.25, y + 0.66, 1.0, 0.03, '#f2c84a'); } }
        break;
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
      // ---- arredi di lusso ----
      case 'drape': {   // tenda di velluto rosso appesa al muro (s = lato del muro), con il bastone e il fermatenda d'oro: ci si nasconde dietro
        const sd = o.s || 'n', v = sd === 'w' || sd === 'e', a = sd === 'n' || sd === 'w' ? 0.12 : 0.6, b = a + 0.3;
        for (let i = 0; i < 5; i++) { const u0 = 0.05 + i * 0.18, u1 = u0 + 0.2, c = i % 2 ? '#6a1828' : '#8a2434'; v ? bx(x + a, y + u0, x + b, y + u1, 0, 2.05, c) : bx(x + u0, y + a, x + u1, y + b, 0, 2.05, c); }
        v ? bx(x + a - 0.03, y + 0.02, x + a + 0.06, y + 0.98, 2.05, 2.15, '#c8a040') : bx(x + 0.02, y + a - 0.03, x + 0.98, y + a + 0.06, 2.05, 2.15, '#c8a040');
        v ? bx(x + a, y + 0.42, x + b + 0.03, y + 0.58, 0.95, 1.05, '#d8b44a') : bx(x + 0.42, y + a, x + 0.58, y + b + 0.03, 0.95, 1.05, '#d8b44a'); break; }
      case 'void': break;   // il vuoto dell'atrio
      case 'balus':   // balaustra di marmo col corrimano d'ottone
        bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0, 0.1, '#d8d0c0');
        for (const a of [0.2, 0.5, 0.8]) for (const b of [0.2, 0.5, 0.8]) if ((a + b) % 0.6 < 0.31) cyl(x + a, y + b, 0.05, 0.1, 0.52, '#e6dece');
        bx(x + 0.05, y + 0.42, x + 0.95, y + 0.58, 0.52, 0.58, '#b8963a'); bx(x + 0.42, y + 0.05, x + 0.58, y + 0.95, 0.52, 0.58, '#b8963a'); break;
      case 'vstep': {   // i gradini dello scalone che scendono nel buio dell'atrio
        const z = -0.3 * o.d, Pp = (u, v) => S(x + u, y + v, z);
        poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], cqShade(x === O1 + 37 || x === O1 + 42 ? '#cfc6b4' : '#7a1e22', Math.max(0.12, 0.62 - o.d * 0.14)));
        qL(x, x + 1, y, z, z + 0.3, cqShade('#cfc6b4', Math.max(0.1, 0.5 - o.d * 0.12))); break; }
      case 'chand': {   // lampadario di cristallo appeso sopra l'atrio
        const z = 1.4; line(S(x + 0.5, y + 0.5, z + 0.3), S(x + 0.5, y + 0.5, 3.4), '#8a7a4a', 1.5);
        cyl(x + 0.5, y + 0.5, 0.75, z, z + 0.12, '#c8a040'); cyl(x + 0.5, y + 0.5, 0.45, z + 0.12, z + 0.3, '#d8b850');
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; dot(x + 0.5 + Math.cos(a) * 0.7, y + 0.5 + Math.sin(a) * 0.7, z - 0.12, 0.05, '#e8f6ff'); dot(x + 0.5 + Math.cos(a) * 0.7, y + 0.5 + Math.sin(a) * 0.7, z + 0.2, 0.035, '#fff2c0'); }
        glow(x + 0.5, y + 0.5, z + 0.1, 3.2, 'rgba(255,225,160,.45)'); break; }
      case 'fount': {   // FONTANA della hall (4x4, disegnata dalla casella davanti): vasca ottagonale di marmo col bordo d'oro, tre vasche, statua dorata, getti d'acqua
        if (o.part) break; const cx = x - 1, cy = y - 1, oct = (r, z) => { const P = []; for (let i = 0; i < 8; i++) { const a = (i + 0.5) * Math.PI / 4; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]); } return P; };
        const ring = (r, z0, z1, side, top) => {   // prisma ottagonale: i fianchi verso chi guarda, poi il piano di sopra
          const A = oct(r, z0), B = oct(r, z1);
          for (let i = 0; i < 8; i++) { const j = (i + 1) % 8, m = (i + 0.5 + 0.5) * Math.PI / 4; if (Math.cos(m) + Math.sin(m) <= 0) continue; poly([S(A[i][0], A[i][1], z0), S(A[j][0], A[j][1], z0), S(B[j][0], B[j][1], z1), S(B[i][0], B[i][1], z1)], cqShade(side, 0.62 + 0.3 * Math.max(0, Math.cos(m - 0.3)))); }
          poly(B.map(p => S(p[0], p[1], z1)), top);
        };
        ring(1.95, 0, 0.12, '#b8b0a0', '#d8d0c0');   // gradino
        ring(1.8, 0.12, 0.42, '#e2dacb', '#f0eadc');   // vasca grande
        { const R = oct(1.8, 0.42); for (let i = 0; i < 8; i++) dot(R[i][0], R[i][1], 0.43, 0.045, '#d8b44a'); K.strokes(R.map((p, i) => [S(p[0], p[1], 0.42), S(R[(i + 1) % 8][0], R[(i + 1) % 8][1], 0.42)]), '#c8a040', Math.max(1.5, TW / 26)); }
        poly(oct(1.6, 0.36).map(p => S(p[0], p[1], 0.36)), '#2f7aa8');   // acqua
        if (TW >= 40) for (const [r, a] of [[1.15, 0.4], [0.75, 2.2], [1.35, 4.1]]) { const [X, Y] = S(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, 0.36); g.strokeStyle = 'rgba(200,240,255,.35)'; g.lineWidth = Math.max(1, TW / 40); g.beginPath(); g.ellipse(X, Y, r * TW * 0.35, r * TW * 0.17, 0, 0, 7); g.stroke(); }
        cyl(cx, cy, 0.32, 0.36, 0.55, '#d8d0c0'); cyl(cx, cy, 0.18, 0.55, 1.15, '#e6dece'); cyl(cx, cy, 0.24, 0.62, 0.7, '#c8a040');   // colonna
        cyl(cx, cy, 0.95, 1.15, 1.3, '#e2dacb'); cyl(cx, cy, 0.85, 1.3, 1.31, '#4a9ac8'); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; dot(cx + Math.cos(a) * 0.95, cy + Math.sin(a) * 0.95, 1.22, 0.035, '#d8b44a'); }   // vasca di mezzo
        cyl(cx, cy, 0.11, 1.31, 1.8, '#e6dece'); cyl(cx, cy, 0.48, 1.8, 1.9, '#e2dacb'); cyl(cx, cy, 0.4, 1.9, 1.91, '#5aaad8'); cyl(cx, cy, 0.5, 1.86, 1.9, '#c8a040');   // vasca piccola
        cyl(cx, cy, 0.09, 1.91, 2.25, '#d8b44a'); dot(cx, cy, 2.4, 0.12, '#e8c860'); bx(cx - 0.18, cy - 0.04, cx + 0.18, cy + 0.04, 2.25, 2.3, '#d8b44a'); dot(cx, cy, 2.55, 0.06, '#f2d878');   // statuina d'oro
        // cascate dalle vasche e quattro getti dal bordo
        const L = []; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; L.push([S(cx + Math.cos(a) * 0.93, cy + Math.sin(a) * 0.93, 1.2), S(cx + Math.cos(a) * 1.0, cy + Math.sin(a) * 1.0, 0.4)]); L.push([S(cx + Math.cos(a) * 0.47, cy + Math.sin(a) * 0.47, 1.85), S(cx + Math.cos(a) * 0.55, cy + Math.sin(a) * 0.55, 1.32)]); }
        K.strokes(L, 'rgba(190,230,255,.55)', Math.max(1, TW / 34));
        g.strokeStyle = 'rgba(200,236,255,.6)'; g.lineWidth = Math.max(1.5, TW / 28);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, [X0, Y0] = S(cx + Math.cos(a) * 1.6, cy + Math.sin(a) * 1.6, 0.5), [X1, Y1] = S(cx + Math.cos(a) * 0.95, cy + Math.sin(a) * 0.95, 1.3), [XC, YC] = S(cx + Math.cos(a) * 1.35, cy + Math.sin(a) * 1.35, 1.6); g.beginPath(); g.moveTo(X0, Y0); g.quadraticCurveTo(XC, YC, X1, Y1); g.stroke(); bx(cx + Math.cos(a) * 1.62 - 0.1, cy + Math.sin(a) * 1.62 - 0.1, cx + Math.cos(a) * 1.62 + 0.1, cy + Math.sin(a) * 1.62 + 0.1, 0.42, 0.55, '#d8b44a'); }
        glow(cx, cy, 0.5, 2.4, 'rgba(120,200,255,.32)'); glow(cx, cy, 2.4, 1.0, 'rgba(255,220,140,.35)'); break; }
      case 'piano': {   // pianoforte a coda nero col coperchio aperto (2x2)
        if (o.part) break; const x0 = x - 1, y0 = y - 1;
        for (const [a, b] of [[0.2, 0.3], [1.7, 0.3], [1.0, 1.7]]) bx(x0 + a, y0 + b, x0 + a + 0.1, y0 + b + 0.1, 0, 0.62, '#111114');
        bx(x0 + 0.1, y0 + 0.15, x + 0.9, y + 0.55, 0.62, 0.9, '#151518'); bx(x0 + 0.1, y + 0.55, x + 0.9, y + 0.8, 0.62, 0.72, '#ece8de');
        poly([S(x0 + 0.15, y0 + 0.2, 0.9), S(x + 0.85, y0 + 0.2, 0.9), S(x + 0.6, y0 + 0.4, 1.9)], '#1e1e24'); line(S(x + 0.85, y0 + 0.2, 0.9), S(x + 0.6, y0 + 0.4, 1.9), '#3a3a44', 1.5);
        bx(x0 + 0.7, y + 0.95, x0 + 1.3, y + 1.15, 0, 0.45, '#151518'); break; }
      case 'vsofa': {   // divano di velluto rosso (b = lato dello schienale)
        const c = '#7a1e2e', b = o.b || 'n'; bx(x + 0.05, y + 0.15, x + 0.95, y + 0.85, 0, 0.42, c);
        if (b === 'n') bx(x + 0.05, y + 0.12, x + 0.95, y + 0.32, 0.42, 0.85, cqShade(c, 0.9)); else bx(x + 0.05, y + 0.68, x + 0.95, y + 0.88, 0.42, 0.85, cqShade(c, 0.9));
        qL(x + 0.05, x + 0.95, y + 0.85, 0.05, 0.08, '#c8a040'); break; }
      case 'armch': { const c = o.c || '#7a1e2e'; bx(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0, 0.42, c); bx(x + 0.15, y + 0.12, x + 0.85, y + 0.3, 0.42, 0.95, cqShade(c, 0.9)); bx(x + 0.12, y + 0.15, x + 0.25, y + 0.85, 0.42, 0.62, cqShade(c, 0.85)); bx(x + 0.75, y + 0.15, x + 0.88, y + 0.85, 0.42, 0.62, cqShade(c, 0.85)); break; }
      case 'ctable': cyl(x + 0.5, y + 0.5, 0.08, 0, 0.36, '#c8a040'); bx(x + 0.12, y + 0.18, x + 0.88, y + 0.82, 0.36, 0.44, '#e8e2d8'); dot(x + 0.5, y + 0.5, 0.48, 0.07, '#c84a6a'); break;
      case 'palm': {   // palma in un vaso d'ottone
        cyl(x + 0.5, y + 0.5, 0.28, 0, 0.5, '#b8902e'); cyl(x + 0.5, y + 0.5, 0.06, 0.5, 1.5, '#6a4a2a');
        const [X, Y] = S(x + 0.5, y + 0.5, 1.5); g.lineCap = 'round';
        for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, r = TW * (0.55 + 0.1 * (i % 2)); g.strokeStyle = i % 2 ? '#3f7a3a' : '#4f9a44'; g.lineWidth = Math.max(2.5, TW / 12); g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(X + Math.cos(a) * r * 0.6, Y - TW * 0.35, X + Math.cos(a) * r, Y + Math.sin(a) * r * 0.35 + TW * 0.05); g.stroke(); }
        break; }
      case 'candel':   // candelabro di bronzo con tre globi
        cyl(x + 0.5, y + 0.5, 0.25, 0, 0.15, '#6a5a3a'); cyl(x + 0.5, y + 0.5, 0.05, 0.15, 1.9, '#8a7040');
        for (const [a, b] of [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5]]) { dot(x + a, y + b, a === 0.5 ? 2.15 : 1.9, 0.09, '#fff2c8'); }
        glow(x + 0.5, y + 0.5, 2.0, 1.4, 'rgba(255,220,150,.4)'); break;
      case 'recdesk':   // banco della reception: piano di marmo, fronte di legno con la fascia d'oro (b = campanello)
        bx(x + 0.05, y + 0.05, x + 0.95, y + 0.95, 0, 0.95, '#5a3a24'); bx(x, y, x + 1, y + 1, 0.95, 1.05, '#e6dece'); qL(x + 0.05, x + 0.95, y + 0.95, 0.5, 0.58, '#c8a040');
        if (o.b) { cyl(x + 0.4, y + 0.5, 0.08, 1.05, 1.12, '#e8c860'); dot(x + 0.4, y + 0.5, 1.14, 0.02, '#fff'); } break;
      case 'keys':   // casellario delle chiavi delle camere
        bx(x + 0.1, y + 0.3, x + 0.9, y + 0.7, 0, 1.9, '#5a3a24'); for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) { qL(x + 0.16 + i * 0.25, x + 0.36 + i * 0.25, y + 0.7, 0.5 + r * 0.33, 0.78 + r * 0.33, '#3a2414'); dot(x + 0.26 + i * 0.25, y + 0.7, 0.6 + r * 0.33, 0.025, '#e8c860'); } break;
      case 'barc':   // bancone del bar: legno scuro, piano di marmo, poggiapiedi d'ottone
        bx(x, y + 0.1, x + 1, y + 0.9, 0, 1.0, '#3a2414'); bx(x, y + 0.05, x + 1, y + 0.95, 1.0, 1.08, '#e2dacb'); qL(x, x + 1, y + 0.9, 0.25, 0.3, '#c8a040'); qL(x + 0.1, x + 0.9, y + 0.9, 0.45, 0.85, '#4a2e1a');
        dot(x + 0.3, y + 0.5, 1.15, 0.05, '#d8a040'); break;
      case 'bottles':   // scaffale delle bottiglie con lo specchio
        bx(x + 0.05, y + 0.1, x + 0.95, y + 0.5, 0, 1.95, '#2a1a10'); qL(x + 0.1, x + 0.9, y + 0.5, 0.2, 1.85, '#6a8a9a');
        for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) bx(x + 0.12 + i * 0.2, y + 0.42, x + 0.2 + i * 0.2, y + 0.5, 0.35 + r * 0.55, 0.62 + r * 0.55, ['#3a7a3a', '#8a5a1a', '#c8c8b8', '#7a1a2a'][(i + r + x) % 4]); break;
      case 'stool': cyl(x + 0.5, y + 0.5, 0.05, 0, 0.7, '#a8acb2'); cyl(x + 0.5, y + 0.5, 0.2, 0.7, 0.8, '#8a1e22'); cyl(x + 0.5, y + 0.5, 0.18, 0, 0.03, '#6a6e74'); break;
      case 'bench': bx(x + 0.1, y + 0.25, x + 0.9, y + 0.75, 0, 0.4, '#5a3a24'); bx(x + 0.12, y + 0.27, x + 0.88, y + 0.73, 0.4, 0.48, '#7a1e2e'); break;
      case 'vase': cyl(x + 0.5, y + 0.5, 0.22, 0, 0.9, '#e6dece'); cyl(x + 0.5, y + 0.5, 0.28, 0.9, 0.98, '#c8a040'); cyl(x + 0.5, y + 0.5, 0.14, 0.98, 1.3, '#2a5a8a'); for (let i = 0; i < 5; i++) dot(x + 0.5 + Math.cos(i * 1.26) * 0.15, y + 0.5 + Math.sin(i * 1.26) * 0.15, 1.45, 0.06, ['#e8406a', '#f2e2f0', '#f2c84a'][i % 3]); break;
      case 'globe': cyl(x + 0.5, y + 0.5, 0.2, 0, 0.08, '#5a3a24'); cyl(x + 0.5, y + 0.5, 0.04, 0.08, 0.8, '#8a6a3a'); { const [X, Y] = S(x + 0.5, y + 0.5, 1.05); g.fillStyle = '#3a7aa8'; g.beginPath(); g.arc(X, Y, TW * 0.22, 0, 7); g.fill(); g.fillStyle = '#6aa04a'; g.beginPath(); g.ellipse(X - TW * 0.05, Y - TW * 0.03, TW * 0.1, TW * 0.07, 0.5, 0, 7); g.fill(); g.strokeStyle = '#c8a040'; g.lineWidth = Math.max(1.5, TW / 30); g.beginPath(); g.arc(X, Y, TW * 0.26, -2.2, 1.2); g.stroke(); } break;
      case 'cart': bx(x + 0.12, y + 0.2, x + 0.88, y + 0.8, 0.12, 0.85, '#c8ccd2'); bx(x + 0.14, y + 0.22, x + 0.86, y + 0.78, 0.85, 1.0, '#f2f0ea'); for (const [a, b] of [[0.2, 0.25], [0.8, 0.25], [0.2, 0.75], [0.8, 0.75]]) dot(x + a, y + b, 0.06, 0.05, '#2a2a2a'); break;
      case 'boiler': cyl(x + 0.5, y + 0.5, 0.42, 0, 1.9, '#8a8478'); cyl(x + 0.5, y + 0.5, 0.44, 0.4, 0.48, '#5a5448'); cyl(x + 0.5, y + 0.5, 0.44, 1.4, 1.48, '#5a5448'); dot(x + 0.5, y + 0.92, 1.0, 0.07, '#e8e0c8'); break;
      case 'pool': {   // acqua della piscina, illuminata da sotto
        const Pp = (u, v) => S(x + u, y + v, -0.12); poly([Pp(0, 0), Pp(1, 0), Pp(1, 1), Pp(0, 1)], (x + y) % 2 ? '#2a7aa8' : '#2e80ae');
        if (TW >= 40 && K.hsh(x, y, 2) < 0.4) K.strokes([[Pp(0.2, 0.4), Pp(0.6, 0.45)]], 'rgba(200,240,255,.35)', Math.max(1.5, TW / 30));
        if ((x === 5 && (y === 21 || y === 29))) glow(x + 0.5, y + 0.5, 0, 1.4, 'rgba(90,200,255,.3)'); break; }
      case 'lounger': bx(x + 0.15, y + 0.05, x + 0.85, y + 0.95, 0.15, 0.25, '#e8e4dc'); bx(x + 0.15, y + 0.05, x + 0.85, y + 0.3, 0.25, 0.55, '#e8e4dc'); for (const [a, b] of [[0.2, 0.1], [0.8, 0.1], [0.2, 0.9], [0.8, 0.9]]) bx(x + a - 0.03, y + b - 0.03, x + a + 0.03, y + b + 0.03, 0, 0.15, '#a8a8a8'); break;
      case 'parasol': cyl(x + 0.5, y + 0.5, 0.04, 0, 1.6, '#e8e4dc'); { const [X, Y] = S(x + 0.5, y + 0.5, 1.6); g.fillStyle = '#c8402a'; g.beginPath(); g.ellipse(X, Y + TW * 0.05, TW * 0.6, TW * 0.28, 0, Math.PI, 0); g.fill(); g.fillStyle = '#e8e4dc'; g.beginPath(); g.ellipse(X, Y + TW * 0.05, TW * 0.6, TW * 0.08, 0, 0, Math.PI); g.fill(); } break;
      case 'bin': bx(x + 0.08, y + 0.15, x + 0.92, y + 0.85, 0, 1.0, '#2e4a3a'); bx(x + 0.05, y + 0.12, x + 0.95, y + 0.88, 1.0, 1.08, '#24382c'); break;
      case 'flower': bx(x + 0.02, y + 0.15, x + 0.98, y + 0.85, 0, 0.3, '#d6ccb6'); bx(x + 0.08, y + 0.2, x + 0.92, y + 0.8, 0.3, 0.38, '#3a2a1a'); for (let i = 0; i < 5; i++) dot(x + 0.15 + i * 0.17, y + 0.5 + (i % 2 ? 0.12 : -0.12), 0.48, 0.07, ['#e8406a', '#f2f0e0', '#c84aa8', '#f2c84a', '#e8406a'][i]); break;
      case 'statue': bx(x + 0.15, y + 0.15, x + 0.85, y + 0.85, 0, 0.6, '#cfc6b4'); cyl(x + 0.5, y + 0.5, 0.14, 0.6, 1.5, '#e6dece'); dot(x + 0.5, y + 0.5, 1.65, 0.13, '#e6dece'); bx(x + 0.3, y + 0.42, x + 0.7, y + 0.58, 1.25, 1.35, '#e6dece'); break;
      case 'lpost':   // lampione di ghisa
        cyl(x + 0.5, y + 0.5, 0.12, 0, 0.2, '#1e2024'); cyl(x + 0.5, y + 0.5, 0.05, 0.2, 2.3, '#24262a'); bx(x + 0.36, y + 0.36, x + 0.64, y + 0.64, 2.3, 2.7, '#f6e2a0'); bx(x + 0.32, y + 0.32, x + 0.68, y + 0.68, 2.7, 2.78, '#1e2024');
        glow(x + 0.5, y + 0.5, 2.5, 1.8, 'rgba(255,220,150,.45)'); break;
      case 'car': {   // auto parcheggiata (2 caselle lungo x, disegnata dalla casella davanti)
        if (o.part) break; const x0 = x - 1, c = o.c || '#3a4a6a';
        for (const [a, b] of [[0.4, 0.15], [1.6, 0.15], [0.4, 0.85], [1.6, 0.85]]) cyl(x0 + a, y + b, 0.17, 0, 0.3, '#141518');
        bx(x0 + 0.08, y + 0.14, x0 + 1.92, y + 0.86, 0.2, 0.62, c); bx(x0 + 0.5, y + 0.2, x0 + 1.45, y + 0.8, 0.62, 1.0, cqShade(c, 1.1));
        qL(x0 + 0.55, x0 + 1.4, y + 0.8, 0.66, 0.96, '#2a3a4a'); poly([S(x0 + 1.45, y + 0.2, 1.0), S(x0 + 1.45, y + 0.8, 1.0), S(x0 + 1.62, y + 0.8, 0.64), S(x0 + 1.62, y + 0.2, 0.64)], '#3a4a5a');
        dot(x0 + 1.93, y + 0.28, 0.45, 0.05, '#e8e0b0'); dot(x0 + 1.93, y + 0.72, 0.45, 0.05, '#e8e0b0'); break; }
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
    const pl = G.plan = { a: pick(['asc', 'sca', 'mon']), b: pick(['tas', 'imp', 'dop']), bc: pick(['post', 'split', 'mon']), c: pick(['las', 'pes', 'cmb']), dr: Math.floor(Math.random() * MP().camere.length), gb: -1, code: String(1000 + Math.floor(Math.random() * 9000)), e: Math.floor(Math.random() * 4) };
    if (window.__PLAN) Object.assign(pl, window.__PLAN);   // prove
    const it = G.it = [], add = (k, s) => it.push({ k, s, c: -1, st: 0 });
    add(ACC[pl.a].it, window.__SPOT0 || pick(ACC[pl.a].cand));   // __SPOT0: prove
    if (pl.b === 'imp') add('imp', pick(['bicch', 'tazz']));
    if (pl.b === 'dop') { add('kA', pick(['kUff', 'kSpo', 'kCus'])); add('kB', pick(['kLav', 'kCan'])); }
    if (pl.c === 'pes') add('fake', 'vetr');
    add('diam', 'teca');
    const b = it.find(i => i.s === 'guard'); if (b) { const cand = G.gd.filter(g => !g.post && floorOf(g.route[0][0]) !== 2); pl.gb = cand.length ? cand[Math.floor(Math.random() * cand.length)].id : -1; if (pl.gb < 0) b.s = 'giacca'; }   // il badge mai alla guardia dell'interrato: prima del badge li' non si arriva
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
      if (c.evUsed) return { k: 'wait', t: '⛓️ Tentativo usato: avvisa i compagni', on: false };
      return { k: 'ev', t: '🔓 Tenta l\'evasione (una volta sola)', on: true };
    }
    if (c.op) return { k: 'wait', t: opTxt(G, c), on: false };
    if (c.hd) { const h = MP().HS[c.hd.i]; return { k: 'unhide', t: '🚶 Esci (sei ' + h.n + ')', on: true }; }
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
    // NASCONDIGLIO vicino: ci si infila solo se nessuna guardia ti sta guardando
    const hi = hideAt(G, c); if (hi >= 0) { const h = M.HS[hi]; return seenBy(G, c) ? { k: 'wait', t: '👀 Ti stanno guardando: non puoi nasconderti', on: false } : { k: 'hide', i: hi, t: h.e + ' Nasconditi ' + h.n, on: true }; }
    return null;
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const nearSpot = (G, c, k) => { const s = spot(G, k), p = P(c); return !!s && Math.hypot(p.x - s.x - 0.5, p.y - s.y - 0.5) < OP_R; };
  function srcAt(G, c) { let b = null, bd = OP_R; const p = P(c); for (const k of needSpots(G)) { const s = spot(G, k), d = Math.hypot(p.x - s.x - 0.5, p.y - s.y - 0.5); if (d < bd) { bd = d; b = k; } } return b; }
  // nascondiglio entro HIDE_R (il piu' vicino), o -1
  function hideAt(G, c) { const p = P(c), H = MP().HS; let b = -1, bd = HIDE_R; for (let i = 0; i < H.length; i++) { const h = H[i], d = Math.hypot(p.x - h.x - 0.5, p.y - h.y - 0.5); if (d < bd) { bd = d; b = i; } } return b; }
  // qualche guardia mi vede adesso? (con la portata secondo la luce)
  function seenBy(G, c) { const p = P(c), ak = alertOn(G) ? 1.22 : 1; return G.gd.some(g => g.st !== 'ko' && Math.hypot(g.x - p.x, g.y - p.y) < 12 && GD.sees(g, p.x, p.y, rangeAt(G, p.x, p.y) * ak) > 0); }
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
    if (a.k === 'hide') { if (seenBy(G, c)) return; c.hd = { i: cur.i, t: G.time }; c.op = null; c.path = []; return; }
    if (a.k === 'unhide') { c.hd = null; return; }
    if (a.k === 'stun') { const g = G.gd.find(o => o.id === cur.g); if (!g) return; GD.stun(G, g); c.ko = (c.ko || 0) + 1; GD.noise(G, g.x, g.y, 2.2); say(G, 'stun', { a: c.id, g: g.id }); return; }
    if (OPD[a.k]) c.op = { k: a.k, t0: G.time, d: OPD[a.k], x: p.x, y: p.y, s: cur.s, sd: cur.sd, nz: 0 };
  }
  // operazione finita
  function opDone(G, c) {
    const o = c.op; c.op = null; const pl = G.plan, M = MP();
    if (o.k === 'src') {
      if (G.sr[o.s]) return; G.sr[o.s] = 1; c.sc = (c.sc || 0) + 1; if (o.s !== 'guard') { const sp = spot(G, o.s); if (sp) GD.anomaly(G, sp.x + 0.5, sp.y + 0.5, 'src'); }
      if (o.s === 'postit' || o.s === 'monit') { G.ck = [1, 1]; say(G, 'code', { a: c.id, s: o.s }); return; }
      if (o.s === 'agenda') { G.ck[0] = 1; say(G, 'code', { a: c.id, s: o.s }); return; }
      if (o.s === 'safe' && pl.b === 'tas' && pl.bc === 'split') { G.ck[1] = 1; say(G, 'code', { a: c.id, s: o.s }); return; }
      const it = G.it.find(i => i.s === o.s && i.st === 0);
      if (it) { it.st = 1; it.c = c.id; say(G, 'found', { a: c.id, it: it.k, s: o.s }); } else say(G, 'empty', { a: c.id, s: o.s });
    }
    else if (o.k === 'acc') { const gt = M.gates[pl.a]; GD.anomaly(G, gt.s[0], gt.s[1] - 0.6, 'door'); G.o1 = 1; useItem(G, ACC[pl.a].it); say(G, 'open1', { a: c.id }); }
    else if (o.k === 'prt') { G.o2 = 1; useItem(G, 'imp'); say(G, 'open2', { a: c.id }); }
    else if (o.k === 'kp') { if (codeAll(G)) { G.o2 = 1; say(G, 'open2', { a: c.id }); } else { GD.noise(G, M.vdoor.s[0], M.vdoor.s[1], 8, 'an'); say(G, 'kpno', { a: c.id }); } }
    else if (o.k === 'turn') { G.tk[o.sd] = G.time; G.tkc[o.sd] = c.id; if (Math.abs(G.tk[0] - G.tk[1]) < TURN_WIN && G.tkc[0] !== G.tkc[1]) { G.o2 = 1; useItem(G, 'kA'); useItem(G, 'kB'); say(G, 'open2', { a: c.id }); } else say(G, 'turn1', { a: c.id }); }
    else if (o.k === 'swp') { G.sw = 1; useItem(G, 'fake'); grabDiam(G, c); }
    else if (o.k === 'cmb') { G.cb = 1; say(G, 'cmb', { a: c.id }); }
    else if (o.k === 'take') grabDiam(G, c);
    else if (o.k === 'free') { G.rescT = G.time + 20; G.cellO = G.time + CELL_OPEN; c.fr = (c.fr || 0) + 1; GD.noise(G, M.cellOut[0], M.cellOut[1], 7); for (const j of G.chars) if (j.jail) j.jail = 0; say(G, 'freed', { a: c.id }); }
    else if (o.k === 'conf') { for (const i of conf(G)) { i.st = 1; i.c = c.id; } say(G, 'conf', { a: c.id }); }
  }
  function useItem(G, k) { const i = G.it.find(o => o.k === k && o.st === 1); if (i) i.st = 3; }
  function grabDiam(G, c) {
    // il diamante preso: la squadra si organizza, una guardia sorveglia l'uscita piu' vicina al furgone
    { const dr = MP().ents[G.plan.e].door; let b = null, bd = 1e9; for (const g of G.gd) { if (g.st === 'ko' || g.st === 'chase' || g.post || floorOf(g.x) !== 0) continue; const d = Math.hypot(g.x - dr[0], g.y - dr[1]); if (d < bd) { bd = d; b = g; } } if (b) { GD.postAt(G, b, dr[0], dr[1], dr[0], dr[1] - 3, 45); GD.say(G, b, 'post'); } }
    G.o3 = 1; const d = G.it.find(i => i.k === 'diam'); d.st = 1; d.c = c.id; G.alP = 1; c.dm = 1; say(G, 'diam', { a: c.id }); }
  function keypad(G, c, v) {
    const M = MP(); if (G.o2 || G.plan.b !== 'tas' || c.jail || dxy(c, M.vdoor.s[0] - 0.5, M.vdoor.s[1]) > 2) return;
    if (String(v) === G.plan.code) { G.o2 = 1; say(G, 'open2', { a: c.id }); }
    else { GD.noise(G, M.vdoor.s[0], M.vdoor.s[1], 8, 'an'); say(G, 'kpno', { a: c.id }); }
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
    setTimeout(() => { const G2 = cq.g; if (G2 === G && G.phase === 'play') GD.noise(G, x, y, COIN_R, 'coin'); }, 500);
  }
  // presa: in cella, la refurtiva va nell'armadio delle confische
  function catchT(G, gd, c) {
    if (c.jail || c.esc) return;
    const M = MP(), n = G.chars.filter(o => o.jail).length, s = M.jail[n % M.jail.length];
    c.hd = null; c.jail = 1; c.jt = G.time; c.jn = (c.jn || 0) + 1; c.op = null; c.path = []; c.ca = (c.ca || 0) + 1; c.evUsed = 0;
    let lost = 0; for (const i of G.it) if (i.st === 1 && i.c === c.id) { i.st = 2; i.c = -1; lost++; } if (c.dm) c.dm = 0;
    if (c.bot || c === G.me) { c.x = s[0]; c.y = s[1]; if (c === G.me) { cq.x = s[0]; cq.y = s[1]; G.myJn = c.jn; } }
    c.js = s; say(G, 'caught', { a: c.id, l: lost }); G.rescT = G.time + 15;   // il computer non corre subito a liberarlo (la guardia e' ancora li')
    if (window.__LOG) window.__LOG.push(Math.round(G.time) + 's ' + c.name + ' preso da ' + gd.id + ' in ' + (MP().rooms[roomAt(c.x, c.y)] || {}).n + ' meta ' + (c.goal ? c.goal.k + (c.goal.s || '') : '-') + ' inseg ' + Math.round(G.time - (gd.cs0 || 0)) + 's');
    if (!free(G).length) MODE.finish(G, 'jail');
  }
  function tryEscape(G, c, ok) {
    if (!c.jail || G.time - c.jt < EV_WAIT || c.evUsed || G.cellO > G.time) return;
    c.evUsed = 1;
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
    else if (e.k === 'flush') { t = mine ? '🚪 Una guardia ha aperto il tuo nascondiglio: SCAPPA!' : '🚪 ' + an + ' è stato scovato nel suo nascondiglio!'; if (mine) cq.hurt = performance.now(); beep(500, 0.12, 0.05, 0, 'square'); beep(380, 0.18, 0.05, 0.12, 'square'); }
    else if (e.k === 'notice') { if (e.x == null || floorOf(e.x) === floorOf(cq.x)) t = '👮 Una guardia ha notato ' + ({ src: 'un posto frugato', door: 'una porta aperta', vault: 'il caveau aperto', dark: 'il quadro manomesso', cam: 'qualcosa' }[e.k2 || e.kk] || 'qualcosa di strano') + ': ora cerca nei dintorni…'; }
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
    c.path = route(c.x, c.y, tx, ty); c.gx = tx; c.gy = ty; return c.path.length > 0 || Math.hypot(c.x - tx, c.y - ty) < 0.7;
  }
  const rangeAt = (G, x, y) => litAt(G, x, y) ? LIT_R : DARK_R;   // portata delle guardie verso il punto x, y: in luce lontano, in ombra solo la torcia
  // una guardia mi vedrebbe in x, y? (con un po' di margine)
  function danger(G, x, y, m = 1) { for (const g of G.gd) { if (g.st === 'ko' || Math.hypot(g.x - x, g.y - y) > 10) continue; if (GD.sees(g, x, y, rangeAt(G, x, y) * (alertOn(G) ? 1.22 : 1) + m) > 0) return g; } return null; }
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
    if (c.dm) { const v = vanP(G); return { x: v.x, y: v.y, k: 'van' }; }
    const jailed = G.chars.filter(o => o.jail);
    if (jailed.length && !(G.cellO > G.time) && G.time > (G.rescT || 0)) { const res = G.chars.filter(o => o.bot && !o.jail && o.goal && o.goal.k === 'free'); if (!res.length || res[0] === c) return { x: M.cellOut[0], y: M.cellOut[1], k: 'free' }; }
    if (G.cellO > G.time && c.jail === 0 && inRoom(c.x, c.y, M.cellRoom)) return { x: 59.5, y: 41.5, k: 'out' };
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
      if (G.time - c.jt > EV_WAIT && !c.evUsed && !(G.cellO > G.time) && !G.chars.some(o => !o.jail && o.goal && o.goal.k === 'free' && Math.hypot(o.x - M.cellOut[0], o.y - M.cellOut[1]) < 12)) { if (Math.random() < 0.02) tryEscape(G, c, Math.random() < 0.55); }
      return;
    }
    // nascosto: resto dentro finche' le guardie non sono lontane
    if (c.hd) { c.walk = 0; c.path = []; if (G.time > (c.hdU || 0) && !G.gd.some(g => g.st !== 'ko' && Math.hypot(g.x - c.x, g.y - c.y) < 6)) doAct(G, c, { k: 'unhide' }); return; }
    if ((c.think -= dt) <= 0) {
      c.think = 0.35 + Math.random() * 0.2;
      const chaser = G.gd.find(g => g.st === 'chase' && g.tgt === c.id), sus = G.gd.find(g => g.st === 'srch' && g.sp && g.sp[0] && Math.hypot(g.sp[0].x - c.x, g.sp[0].y - c.y) < 3.5 && Math.hypot(g.x - c.x, g.y - c.y) < 9) || G.gd.find(g => (g.st === 'sus' || g.st === 'inv') && g.st !== 'ko' && Math.hypot((g.st === 'sus' ? g.lx : g.ix) - c.x, (g.st === 'sus' ? g.ly : g.iy) - c.y) < 3 && Math.hypot(g.x - c.x, g.y - c.y) < 9);
      if (chaser || sus) { if (!((c.scare || 0) > G.time) && c.goal) c.g0 = c.goal.k + (c.goal.s || '') + '@' + (MP().rooms[roomAt(c.x, c.y)] || {}).n; c.scare = G.time + 4 + Math.random() * 3; }
      if ((sus || chaser) && !c.op && hideAt(G, c) >= 0 && !seenBy(G, c)) { const a = action(G, c); if (a && a.k === 'hide') { doAct(G, c, { k: 'hide' }); c.hdU = G.time + 4 + Math.random() * 6; return; } }
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
      if ((c.hold || 0) > G.time && c.goal.k !== 'stalk') { const g = danger(G, c.x, c.y, 0.8); if (g) flee(G, c, g); else { c.walk = 0; return; } }
      else { const p = c.path[0], q = c.path[2] || p, r = c.path[4] || q; const g = p && (danger(G, q[0], q[1], 1.2) || danger(G, p[0], p[1], 1.2) || danger(G, r[0], r[1], 0.6)); if (g && g.st !== 'chase' && !(c.goal.k === 'stalk' && g.id === G.plan.gb && !GD.sees(g, c.x, c.y, rangeAt(G, c.x, c.y) + 0.5))) { c.hold = G.time + 0.8 + Math.random() * 1.6; c.path = []; c.walk = 0; return; } }   // la guardia col badge: ci si avvicina finche' non mi vede
    }
    cqModeStep(c, dt, (c.goal && c.goal.k === 'flee' ? 1 : WALK) * MODE.speed(c));
  }

  // ======================= IL GIOCO NEL MOTORE =======================
  function setup(G) {
    G.lg = []; G.lgN = 0; G.sr = {}; G.ck = [0, 0]; G.o1 = 0; G.o2 = 0; G.o3 = 0; G.lz = 0; G.sw = 0; G.cb = 0; G.tk = [-9, -9]; G.tkc = [-1, -1]; G.alE = 0; G.alP = 0;
    G.dk = { T: 0, S: 0, I: 0 }; G.cellO = 0; G.qi = 0; G.cn = []; G.cnN = 0; G.cs = MP().hcams.map(() => 0); G.ccd = MP().hcams.map(() => 0); G.left = G.opt.time || 600; G.esc = null; G.myJn = 0;
  }
  // porte: chiuse/aperte su ogni telefono (cqSolid) secondo lo stato
  function syncDoors(G) {
    const M = MP(), want = { sca: G.o1 && G.plan.a === 'sca', asc: G.o1 && G.plan.a === 'asc', mon: G.o1 && G.plan.a === 'mon', vault: !!G.o2, cell: G.cellO > G.time };
    G.dD = G.dD || {};
    for (const k in want) {
      const v = want[k] ? 1 : 0; if (G.dD[k] === v) continue; G.dD[k] = v;
      const D2 = k === 'vault' ? M.vdoor.d : k === 'cell' ? M.cdoor.d : M.gates[k].d;   // porte di un passaggio: quella al piano terra e quella nell'interrato
      for (const [x, y, t, o] of D2) { cqSolid[y][x] = v ? null : { prop: t, o }; cqBgCell(x, y, 1); }
      if (!v && !cqFree(cq.x, cq.y)) { const q = cqSpot(Math.floor(cq.x), Math.floor(cq.y)); cq.x = q.x; cq.y = q.y; }
      const d = Math.min(...D2.map(q => Math.hypot(q[0] - cq.x, q[1] - cq.y))); if (d < 14 && G.time > 0.5) { thud(0.6 * (1 - d / 14), k === 'vault' ? 70 : 140); }
    }
    // il furgone della fuga nel parcheggio di stanotte (fari accesi quando c'e' il diamante)
    const on = G.o3 ? 1 : 0;
    if (G.vanE !== G.plan.e || G.vanOn !== on) {
      const E = M.ents[G.plan.e], [x, y] = E.v; G.vanE = G.plan.e; G.vanOn = on;
      cqSolid[y][x] = { prop: 'van', o: { on } }; cqSolid[y][x - 1] = { prop: 'van', o: { part: 1 } }; cqBgCell(x, y); cqBgCell(x - 1, y);
    }
  }
  // PASSAGGI DA PRESIDIARE (allarme di squadra): sul piano del ladro, il piu' vicino a lui ma non addosso
  function chokes(G, x, y) {
    const M = MP(), f = floorOf(x), g0 = G.plan ? M.gates[G.plan.a] : null;
    const L = f === 0 ? [[39.5, 34.6], [58.5, 42.5], [39.5, 50.4]].concat(g0 && G.o1 ? [g0.s] : []) : f === 1 ? [[O1 + 39.5, 22.6], [O1 + 55.5, 48.5]] : g0 && G.o1 ? [[g0.si[0] - 0.5, g0.si[1]]] : [];
    return L.map(p => [p, Math.hypot(p[0] - x, p[1] - y)]).filter(q => q[1] > 3).sort((a, b) => a[1] - b[1]).map(q => q[0]);
  }
  // dove ci si mette per salire sul furgone
  const vanP = G => MP().ents[G.plan ? G.plan.e : 0].van;
  const scrA = a => { const c = Math.cos(a), s = Math.sin(a); return Math.atan2((c + s) / 2, c - s); };
  const env = G => { const M = MP(), E = { thieves: free(G).filter(c => !c.hd), pos: P, vis: c => c.bot ? 0.65 : 1,   // i compagni del computer si notano un po' meno (come negli altri giochi furtivi cooperativi)
  range: (x, y) => rangeAt(G, x, y), alert: alertOn(G), k: G.opt.dif === 'f' ? 0.8 : G.opt.dif === 'd' ? 1.25 : 1, speed: 1,
    // CERVELLO DELLE GUARDIE (giochi/lib/guardie.js): nascondigli da perquisire, stesso piano, passaggi da presidiare, cose fuori posto
    hides: M.HS, hiddenAt: i => free(G).find(c => c.hd && c.hd.i === i) || null, same: (x1, y1, x2, y2) => floorOf(x1) === floorOf(x2),
    onFlush: (gd, c) => { c.hd = null; say(G, 'flush', { a: c.id }); }, chokes: (x, y) => chokes(G, x, y), onNotice: (gd, an) => say(G, 'notice', { kk: an.k, x: an.x }),
    onCatch: (gd, c) => catchT(G, gd, c), onKo: () => { G.alE = Math.max(G.alE || 0, G.time + ALERT_T); say(G, 'kofound', {}); },
    onChase: (gd, c) => { gd.cs0 = G.time; if (window.__LOG) window.__LOG.push(Math.round(G.time) + 's VISTO ' + c.name + ' da ' + gd.id + ' d=' + Math.hypot(gd.x - P(c).x, gd.y - P(c).y).toFixed(1) + ' in ' + (MP().rooms[roomAt(P(c).x, P(c).y)] || {}).n + ' meta ' + (c.goal ? c.goal.k : '-') + ' (prima: ' + c.g0 + ')' + ' guardia era ' + gd.st0 + ' sosp ' + (G.time - (gd.sT || 0)).toFixed(1) + 's' + (c.op ? ' OP ' + c.op.k : '') + ((c.hold || 0) > G.time ? ' FERMO' : '') + ((c.scare || 0) > G.time ? ' PAURA' : '') + (darkAt(G, P(c).x, P(c).y) ? ' buio' : '') + (alertOn(G) ? ' ALLERTA' : '')); GD.alarm(G, gd, E); say(G, 'chase', { a: c.id }); } };
  return E; };
  const MODE = CQ_MODES.colpo = {
    n: 'Colpo all\'hotel',
    desc: '💎 Tutti ladri insieme: rubate il diamante nel caveau del Grand Hotel senza farvi prendere dalle guardie. Il colpo cambia ogni volta.',
    maps: [['grandhotel', 'Grand Hotel di notte']],
    def: { time: 720, dif: 'n', map: 'grandhotel', n: 4, fill: true },
    ns: [[2, '2'], [4, '4'], [6, '6'], [8, '8']],   // anche in due (meno guardie)
    opts: o => `<div class="row"><div class="lbl">Guardie</div>${seg('dif', [['f', 'Facili'], ['n', 'Normali'], ['d', 'Difficili']], o.dif || 'n')}</div>
      <div class="row"><div class="lbl">Durata</div>${seg('time', [[600, '10:00'], [720, '12:00'], [900, '15:00']], o.time || 720)}</div><div class="hint">In due le guardie sono meno.</div>`,
    read: d => ({ dif: d.get('dif') || 'n', time: +d.get('time') || 720 }),
    start(G) {
      cq.mapDirty = true; cqUseMap('grandhotel');   // porte di nuovo chiuse (la mappa fissa resta in memoria tra una partita e l'altra)
      const M = MP(), R = M.routes, dif = G.opt.dif || 'n';
      // quante guardie: secondo la difficolta' e quanti ladri (in due meno guardie)
      const nl = G.chars.length, ng = Math.min(8, { f: 4, n: 6, d: 8 }[dif] - (nl <= 2 ? 2 : 0) + (nl >= 6 ? 1 : 0));
      const list = ['cella', 'hall', 'primo', 'interrato', 'servizio', 'camere', 'ovest', 'esterno'].slice(0, ng);
      GD.pathFn = route;   // le guardie salgono e scendono le scale
      G.gd = GD.make(list.map(k => R[k])); G.gd.forEach(g => { if (!g.post) { g.ri = Math.floor(Math.random() * g.route.length); const w = g.route[g.ri]; g.x = w[0]; g.y = w[1]; g.a = w[3] || 0; } });
      setup(G); makePlan(G); cq.hcRun = false;
      if (window.__ENT != null) G.plan.e = window.__ENT;   // prove
      // nessun ladro del computer vestito da guardia (si confonderebbe con quelle vere)
      const sk = Object.keys(CQ_SKINS).filter(k => k !== 'guardia' && k !== 'omino' && !G.chars.some(c => c.look && c.look.skin === k));
      for (const c of G.chars) if (c.bot && c.look && c.look.skin === 'guardia') { const k = sk.shift(); c.look = k ? { skin: k, col: CQ_SKINS[k].col, hat: 'nessuno' } : { skin: 'omino', col: '#e2553a', hat: 'borsalino' }; }
      const ring = M.ents[G.plan.e].ring.slice();
      G.chars.forEach((c, i) => { const [x, y] = ring[i % ring.length]; Object.assign(c, { x: x + 0.5, y: y + 0.5, jail: 0, jt: 0, jn: 0, op: null, coins: COINS, path: [], dm: 0, esc: 0, sc: 0, ko: 0, fr: 0, ca: 0, ev: 0, evf: 0, lo: 0, t: 0 }); });
      cq.x = G.me.x; cq.y = G.me.y;
    },
    gstart(G) { cq.mapDirty = true; cqUseMap('grandhotel'); GD.pathFn = route; setup(G); cq.hcRun = false; G.gd = []; G.plan = null; G.it = []; },
    intro: G => G.plan ? '💎 Entrate dal ' + ENT[G.plan.e] + ': guardate la lavagna in alto a sinistra!' : '💎 Colpo all\'hotel',
    speed(c) {
      const G = cq.g; if (!G || !G.plan) return 1; if (c.op || c.esc) return 0;
      if (c.hd) return 0;
      return (c === G.me ? (cq.hcRun && !c.jail ? 1 : WALK) : 1) * (c.dm ? 0.94 : 1);
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
    hide: c => !!c.hd,   // nascosto: non si disegna (si vedono solo gli occhi nel nascondiglio)
    nameCol: c => c.jail ? '#9aa0a8' : TC,
    // le guardie (non sono personaggi: si disegnano come comparse) quando le vedo
    extras(G) {
      if (!G.gd) return [];
      const out = [], me = G.me, M = MP();
      for (const g of G.gd) {
        if (!guardSeen(G, g)) continue;
        if (!g.__dr) { const gg = g; g.__dr = (cx, X, Y, TW) => guardDraw(cx, X, Y, TW, gg); g.__dr.top = 2.05; }
        out.push({ x: g.x, y: g.y, L: null, w: g.walk, f: 1, name: null, all: true, dr: g.__dr });
      }
      void me; void M; return out;
    },
    btn(G) { if (!G.plan) return null; const a = action(G, G.me); return a ? { t: a.t, on: a.on } : null; },
    act(G) {
      const me = G.me, a = action(G, me); if (!a || !a.on) return;
      if (a.k === 'kp') { keypadUI(G); return; }
      if (a.k === 'quad') { quadroUI(G); return; }
      if (a.k === 'ev') { lockUI(G); return; }
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
      // SCALE E ASCENSORI: entrando nella casella del passaggio si cambia piano. Dopo l'arrivo il passaggio si riattiva solo quando ci si e' allontanati
      // di 2 caselle (se no, continuando a camminare nella stessa direzione, si tornerebbe subito indietro)
      if (!me.bot && !me.jail && !me.esc) {
        if (G.tpL && Math.hypot(cq.x - G.tpL[0], cq.y - G.tpL[1]) > 2) G.tpL = null;
        const Pq = portalAt(cq.x, cq.y);
        if (Pq && !G.tpL) { const [x, y] = Pq.to(cq.x, cq.y); cq.x = x; cq.y = y; G.tpL = [x, y]; thud(0.35, Pq.k === 'asc' || Pq.k === 'mon' ? 90 : 160); }
      }
      // cambio di piano (scale, ascensori, cella): dissolvenza dal nero e il nome del piano
      { const f = floorOf(cq.x); if (G.myF !== f) { if (G.myF != null) G.fade = performance.now(); G.myF = f; } }
      // battito del cuore se una guardia mi sospetta o mi insegue
      G.hb = 0;
      for (const g of G.gd) { if (g.st === 'chase' && g.tgt === me.id) G.hb = 1; else if (g.st === 'sus' && Math.hypot(g.lx - cq.x, g.ly - cq.y) < 2.5) G.hb = Math.max(G.hb, 0.4 + 0.6 * g.sus); }
      if (!me.jail) for (const g of G.gd) { if (g.st === 'ko' || floorOf(g.x) !== floorOf(cq.x)) continue; const d = Math.hypot(g.x - cq.x, g.y - cq.y); if (d < HB_R) G.hb = Math.max(G.hb, (me.hd ? 0.35 : 0.2) + (me.hd ? 0.55 : 0.4) * (1 - d / HB_R)); }   // una guardia vicina che non mi vede: il cuore batte
      // nascosto: mi muovo = esco (dopo un attimo, se no chi tiene il joystick uscirebbe subito)
      if (me.hd && !G.hdW) { G.hdW = 1; G.hdT = performance.now(); } else if (!me.hd) G.hdW = 0;
      if (me.hd && !me.bot && performance.now() - G.hdT > 600 && cqDir() && !G.hdOut) { G.hdOut = performance.now(); if (G.guest) cqNetSend({ k: 'a', a: 'unhide' }); else doAct(G, me, { k: 'unhide' }); }
      if (G.hdOut && performance.now() - G.hdOut > 800) G.hdOut = 0;
      if (G.hb > 0 && (G.hbT = (G.hbT || 0) - dt) <= 0) { G.hbT = 0.35 + 0.4 * (1 - G.hb); G.hbP = performance.now(); const v = 0.05 + 0.1 * G.hb; beep(58, 0.11, v, 0, 'sine'); beep(50, 0.12, v * 0.8, 0.15, 'sine'); }
      // rumore durante la combinazione (click che si sentono)
      for (const c of G.chars) if (c.op && c.op.k === 'cmb' && Math.random() < dt * 2) { const d = Math.hypot(c.x - cq.x, c.y - cq.y); if (d < 10) beep(1800 + Math.random() * 400, 0.02, 0.02 * (1 - d / 10)); }
      // passi delle guardie vicine
      for (const g of G.gd) { if (g.st === 'ko' || !g.walk) continue; const d = Math.hypot(g.x - cq.x, g.y - cq.y); if (d < 9 && (g.stT = (g.stT || 0) - dt) <= 0) { g.stT = g.st === 'chase' ? 0.26 : 0.5; thud(0.18 * (1 - d / 9), 300 + g.id * 20); } }
    },
    tick(G, dt) {
      G.left -= dt;
      const M = MP(), E = env(G);
      if (G.o2 && !G.anV) { G.anV = 1; GD.anomaly(G, M.vdoor.s[0], M.vdoor.s[1], 'vault'); }   // la porta del caveau aperta: chi la vede da' l'allarme
      GD.tick(G, dt, E);
      for (const g of G.gd) npcTp(g);   // guardie che salgono o scendono
      // telecamere: chi resta nel cono per 0,7 s fa venire la guardia piu' vicina
      M.hcams.forEach((cm, i) => {
        if (darkAt(G, cm.x, cm.y) || G.ccd[i] > G.time) { G.cs[i] = 0; return; }
        const seen = free(G).find(c => !c.hd && GD.camSees(G, cm, P(c).x, P(c).y));
        if (!seen) { G.cs[i] = Math.max(0, G.cs[i] - dt); return; }
        G.cs[i] += dt; if (G.cs[i] < 0.7) return;
        G.cs[i] = 0; G.ccd[i] = G.time + 6; const p = P(seen);
        let b = null, bd = 1e9; for (const g of G.gd) { if (g.st === 'ko' || g.st === 'chase' || g.post) continue; const d = Math.hypot(g.x - p.x, g.y - p.y); if (d < bd) { bd = d; b = g; } }
        if (b) { GD.investigate(b, p.x, p.y, 'cam'); GD.say(G, b, 'an', 'cam'); } say(G, 'cam', { a: seen.id });
      });
      // quadro elettrico toccato: una guardia va a controllare
      if (G.qi && G.time >= G.qi) { G.qi = 0; const q = M.SP.quadro; GD.anomaly(G, q.x + 0.5, q.y + 1.5, 'dark'); let b = null, bd = 1e9; for (const g of G.gd) { if (g.st === 'ko' || g.st === 'chase') continue; const d = Math.hypot(g.x - q.x, g.y - q.y); if (d < bd) { bd = d; b = g; } } if (b) GD.investigate(b, q.x + 0.5, q.y + 1.5); }
      // operazioni in corso: ci si deve stare fermi
      for (const c of G.chars) {
        if (!c.op) continue; const p = P(c);
        if (c.jail || Math.hypot(p.x - c.op.x, p.y - c.op.y) > 0.5) { c.op = null; continue; }
        if (c.op.k === 'cmb' && G.time - c.op.t0 > (c.op.nz + 1) * 3) { c.op.nz++; GD.noise(G, p.x, p.y, 6); }
        if (G.time - c.op.t0 >= c.op.d) opDone(G, c);
      }
      // la cella aperta si richiude; chi e' ancora dentro resta prigioniero
      if (G.cellO && G.time >= G.cellO && G.cellO > 0) { G.cellO = 0; for (const c of G.chars) if (!c.jail && !c.esc && inRoom(P(c).x, P(c).y, M.cellRoom)) { c.jail = 1; c.jt = G.time; } }
      // CORRERE FA RUMORE: chi va piu' veloce del passo felpato si sente (le guardie vicine vengono a vedere)
      for (const c of free(G)) { const p = P(c); if (c.lpx != null) { const v = Math.hypot(p.x - c.lpx, p.y - c.lpy) / dt; if (v < CQ_SPEED * 3) c.rv = (c.rv || 0) * 0.8 + v * 0.2; } c.lpx = p.x; c.lpy = p.y;
        if ((c.rv || 0) > CQ_SPEED * 0.8 && !c.op) { if ((c.nzT = (c.nzT || 0) - dt) <= 0) { c.nzT = 0.7; GD.noise(G, p.x, p.y, RUN_R); } } else c.nzT = 0; }
      // fuga col diamante (chi ce l'ha in tasca: anche dopo averlo ripreso dall'armadio delle confische)
      { const di = G.it.find(i => i.k === 'diam'); for (const c of G.chars) c.dm = di && di.st === 1 && di.c === c.id ? 1 : 0; }
      const dh = G.chars.find(c => c.dm && !c.jail);
      if (dh && !G.esc && dxy(dh, vanP(G).x, vanP(G).y) < VAN_R) { G.esc = { id: dh.id, at: G.time + 1.5 }; dh.esc = 1; say(G, 'esc', { a: dh.id }); }
      if (G.esc && G.time >= G.esc.at) { MODE.finish(G, 'win'); return; }
      // computer
      for (const c of G.chars) { if (!c.bot || !c.alive || c.esc) continue; botT(G, c, dt); npcTp(c); }
      if (G.left <= 0) MODE.finish(G, 'time');
    },
    finish(G, why) {
      const name = c => c.name + (c === G.me ? ' (tu)' : '');
      const line = c => [name(c), '— ' + [c.dm || (G.esc && G.esc.id === c.id) ? '💎 ha portato il diamante' : '', c.sc ? '🔍 ' + c.sc : '', c.ko ? '👊 ' + c.ko : '', c.fr ? '🔓 ' + c.fr + ' liberati' : '', c.ca ? '⛓️ preso ' + c.ca + (c.ca > 1 ? ' volte' : ' volta') : ''].filter(Boolean).join(' · ')];
      const rank = G.chars.slice().sort((a, b) => ((b.sc || 0) + (b.fr || 0) * 2 + (b.ko || 0) - (b.ca || 0)) - ((a.sc || 0) + (a.fr || 0) * 2 + (a.ko || 0) - (a.ca || 0))).map(line);
      if (why === 'win') cqModeEnd({ t: '💎 Colpo riuscito!', why: 'Il diamante è sul furgone' + (G.chars.some(c => c.jail) ? ' (qualcuno è rimasto in cella…)' : '') + '.' + funny(G, 1), win: G.chars.map(c => c.id), rank });
      else cqModeEnd({ t: '🚔 Colpo fallito', why: (why === 'jail' ? 'Tutti in cella: le guardie festeggiano.' : 'Tempo scaduto: sta arrivando la polizia.') + funny(G, 0), win: [], rank });
    },
    csnap: c => { const G = cq.g; return [c.jail ? 1 : 0, Math.round((G.time - (c.jt || 0)) * 10) / 10, c.op ? Object.keys(OPD).indexOf(c.op.k) : -1, c.op ? Math.round((G.time - c.op.t0) * 10) / 10 : 0, c.coins || 0, c.jn || 0, c.js || 0, c.dm ? 1 : 0, c.esc ? 1 : 0, c.evUsed ? 1 : 0, [c.sc || 0, c.ko || 0, c.fr || 0, c.ca || 0, c.ev || 0, c.evf || 0, c.lo || 0], c.hd ? c.hd.i : -1]; },
    capply(G, c, a) {
      c.jail = a[0]; c.jt = G.time - a[1]; const k = Object.keys(OPD)[a[2]];
      c.op = k ? { k, t0: G.time - a[3], d: OPD[k], x: c === G.me ? cq.x : c.x, y: c === G.me ? cq.y : c.y } : null;
      c.hd = a[11] >= 0 ? (c.hd && c.hd.i === a[11] ? c.hd : { i: a[11], t: G.time }) : null;
      c.coins = a[4]; c.jn = a[5]; c.js = a[6] || null; c.dm = a[7]; c.esc = a[8]; c.evUsed = a[9]; [c.sc, c.ko, c.fr, c.ca, c.ev, c.evf, c.lo] = a[10];
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
      const me = G.me, M = MP(), mf = floorOf(cq.x), near = (x, y, k) => Math.abs(x - cq.x) < k && Math.abs(y - cq.y) < k && floorOf(x) === mf, lights = [[cq.x, cq.y, MY_R, 0.75]];
      for (const [x, y, a] of M.lamps) if (near(x, y, 16) && !(a !== 'X' && G.time < (G.dk[a] || 0))) lights.push([x, y, LAMP_R * 1.15, 0.78]);
      for (const g of G.gd) if (near(g.x, g.y, 20)) { lights.push([g.x, g.y, 1.0, 0.6]); if (g.st !== 'ko') lights.push([g.x, g.y, DARK_R * 1.05, 0.72, scrA(g.a), GD.HALF]); }
      if (!G.o3 && mf === 2) lights.push([M.teca.x + 0.5, M.teca.y + 0.5, 1.5, 0.55]);
      for (const c of G.chars) if (c !== me && c.alive && !c.esc && near(c.x, c.y, 16)) lights.push([c.x, c.y, 1.0, 0.45]);
      return { a: 0.95, r: MY_R, lights, see: x => floorOf(x) === mf };   // si vede solo chi e' al mio piano
    },
    deco(g, c, X, Y, TW, G) {
      if (c.op) { const k = Math.min(1, (G.time - c.op.t0) / c.op.d); g.strokeStyle = '#f2c84a'; g.lineWidth = 4; g.beginPath(); g.arc(X, Y - TW * 2.1, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); }
      if (c.dm) { g.font = Math.round(TW * 0.4) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💎', X + TW * 0.35, Y - TW * 1.2 + Math.sin(performance.now() / 200) * 2); }
      if (c.jail) { g.strokeStyle = '#8a9098'; g.lineWidth = 2; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X + s * TW * 0.18, Y - TW * 0.45, TW * 0.08, TW * 0.05, 0, 0, 7); g.stroke(); } }
    },
    over(g, G, sx, sy, TW) {
      if (!G.plan) return;
      const me = G.me, W2 = cq.w, H2 = cq.h, M = MP(), now = performance.now() / 1000, mf = floorOf(cq.x), near = (x, y, r) => Math.abs(x - cq.x) < r && Math.abs(y - cq.y) < r && floorOf(x) === mf;
      const wedge = (pts, col, line) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(sx(x, y), sy(x, y)) : g.moveTo(sx(x, y), sy(x, y))); g.closePath(); g.fill(); if (line) { g.strokeStyle = line; g.lineWidth = 1.5; g.stroke(); } };
      // CONI DI VISTA delle guardie che vedo (fermati dai muri) e delle telecamere accese
      for (const gd of G.gd) {
        if (gd.st === 'ko' || !guardSeen(G, gd)) continue;
        const ak = alertOn(G) ? 1.22 : 1, ch = gd.st === 'chase', su = gd.sus > 0.05;
        wedge(GD.cone(gd.x, gd.y, gd.a, LIT_R * ak), ch ? 'rgba(255,60,50,.1)' : su ? 'rgba(255,150,40,.09)' : 'rgba(255,236,150,.06)', ch ? 'rgba(255,80,60,.35)' : su ? 'rgba(255,170,60,.3)' : 'rgba(255,236,150,.18)');   // fin qui ti vede se sei in luce
        wedge(GD.cone(gd.x, gd.y, gd.a, DARK_R * ak), ch ? 'rgba(255,60,50,.3)' : su ? 'rgba(255,150,40,.28)' : 'rgba(255,236,150,.2)', ch ? 'rgba(255,80,60,.75)' : su ? 'rgba(255,170,60,.65)' : 'rgba(255,236,150,.45)');   // la torcia: qui ti vede anche al buio
      }
      M.hcams.forEach((cm, i) => {
        if (!near(cm.x, cm.y, 16)) return; const off = darkAt(G, cm.x, cm.y), X = sx(cm.x, cm.y), Y = sy(cm.x, cm.y) - TW * 1.0;
        if (!off) wedge(GD.cone(cm.x, cm.y, GD.camA(G, cm), cm.r, cm.h, 12), (G.cs[i] || 0) > 0.05 ? 'rgba(255,60,50,.24)' : 'rgba(255,90,90,.13)', 'rgba(255,90,90,.4)');
        g.fillStyle = off ? '#333' : (now * 2 | 0) % 2 ? '#ff3030' : '#801818'; g.beginPath(); g.arc(X, Y, 3.5, 0, 7); g.fill();
      });
      // segni sopra le guardie (? ! …)
      for (const gd of G.gd) if (guardSeen(G, gd)) GD.mark(g, gd, sx(gd.x, gd.y), sy(gd.x, gd.y), TW, 1.75);
      for (const gd of G.gd) if (gd.bub && guardSeen(G, gd) && near(gd.x, gd.y, 12)) GD.bubble(g, gd, sx(gd.x, gd.y), sy(gd.x, gd.y), TW, 2.15);   // fumetti con le frasi delle guardie
      // la guardia col badge: si vede la tessera alla cintura (da vicino)
      if (G.plan.gb >= 0 && G.it.some(i => i.s === 'guard' && i.st === 0)) { const gd = G.gd[G.plan.gb]; if (gd && guardSeen(G, gd) && Math.hypot(gd.x - cq.x, gd.y - cq.y) < 6) { g.font = Math.round(TW * 0.32) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💳', sx(gd.x, gd.y) + TW * 0.3, sy(gd.x, gd.y) - TW * 0.9); } }
      // stelline sui posti da frugare
      for (const k of needSpots(G)) { const s = spot(G, k); if (!near(s.x, s.y, 14)) continue; const X = sx(s.x + 0.5, s.y + 0.5), Y = sy(s.x + 0.5, s.y + 0.5) - TW * 1.25 + Math.sin(now * 3 + s.x) * 3, q = TW * (0.13 + 0.04 * Math.sin(now * 5 + s.y)); star(g, X, Y, q, '#fff4b8'); }
      if (conf(G).length) { const s = M.SP.conf; if (near(s.x, s.y, 14)) star(g, sx(s.x + 0.5, s.y + 0.5), sy(s.x + 0.5, s.y + 0.5) - TW * 1.6, TW * 0.16, '#ff9a6a'); }
      // cartello "Non disturbare" sulla porta della camera del direttore
      if ((G.plan.a === 'asc' && G.it.some(i => i.s === 'comod')) || (G.plan.b === 'tas' && G.plan.bc === 'split')) { const r = M.camere[G.plan.dr], [dx, dy] = r.sign; if (near(dx, dy, 14)) { const X = sx(dx + 0.5, dy + 1), Y = sy(dx + 0.5, dy + 1) - TW * 1.5; g.fillStyle = '#c8302a'; cqRR(g, X - 15, Y - 7, 30, 14, 3); g.fill(); g.fillStyle = '#fff'; g.font = '700 7px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NON', X, Y - 3); g.fillText('DISTURBARE', X, Y + 3.5); } }
      // passaggi fuori servizio e sbarramenti
      for (const k in M.gates) for (const q of [M.gates[k].s, M.gates[k].si]) { if (!near(q[0], q[1], 14)) continue; const X = sx(q[0] - 0.5, q[1] - 0.5), Y = sy(q[0] - 0.5, q[1] - 0.5) - TW * 2.1; g.font = Math.round(TW * 0.42) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k !== G.plan.a ? '🚫' : G.o1 ? '✅' : '🔒', X, Y); }
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
      // i miei passi di corsa: anelli che si allargano (fin dove ti sentono)
      if (cq.hcRun && cq.walk && !me.jail) { const k = (now % 0.7) / 0.7, X = sx(cq.x, cq.y), Y = sy(cq.x, cq.y); g.strokeStyle = 'rgba(255,200,120,' + (0.5 * (1 - k)) + ')'; g.lineWidth = 2; g.beginPath(); g.ellipse(X, Y, RUN_R * TW * 0.707 * k, RUN_R * TW * 0.354 * k, 0, 0, 7); g.stroke(); }
      // furgone: freccia per chi ha il diamante
      if (me.dm && !me.jail) { const t = toward(vanP(G).x, vanP(G).y); SQ.edge(g, sx(t.x, t.y), sy(t.x, t.y) - TW, W2, H2, t.p ? '🪜' : '🚐', '#3fae5a'); }
      // allerta: bordo rosso che pulsa; inseguito: bordi rossi col battito
      if (alertOn(G)) { const a = 0.18 + 0.12 * Math.sin(now * 4); g.strokeStyle = 'rgba(255,40,40,' + a + ')'; g.lineWidth = 8; g.strokeRect(4, 4, W2 - 8, H2 - 8); }
      if (G.hb > 0) { const k = Math.max(0, 1 - (performance.now() - (G.hbP || 0)) / 380), a = 0.12 + 0.3 * G.hb * (0.5 + 0.5 * k); const gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.3, W2 / 2, H2 / 2, Math.max(W2, H2) * 0.72); gr.addColorStop(0, 'rgba(160,0,0,0)'); gr.addColorStop(1, 'rgba(160,0,0,' + a + ')'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2); }
      for (const c of G.chars) { if (!c.hd || !c.alive) continue; const h = M.HS[c.hd.i]; if (!near(h.x, h.y, 16)) continue; const X = sx(h.x + 0.5, h.y + 0.5), Y = sy(h.x + 0.5, h.y + 0.5) - TW * (h.t === 'bed' ? 0.5 : 1.1), bl = (now * 0.8 + c.id) % 3 < 0.12;
        g.fillStyle = 'rgba(10,10,14,.7)'; cqRR(g, X - 13, Y - 7, 26, 14, 7); g.fill(); g.fillStyle = '#f2f0e8'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X + s * 5, Y, 3.2, bl ? 0.6 : 3, 0, 0, 7); g.fill(); } g.fillStyle = '#1a1a1a'; if (!bl) for (const s of [-1, 1]) { g.beginPath(); g.arc(X + s * 5 + Math.sin(now) * 1.2, Y, 1.5, 0, 7); g.fill(); } }
      if (me.hd) { const gr = g.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.18, W2 / 2, H2 / 2, Math.max(W2, H2) * 0.6); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.78)'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
        const h = M.HS[me.hd.i]; g.font = '700 13px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(10,10,14,.7)'; cqRR(g, W2 / 2 - 120, H2 * 0.62 - 13, 240, 26, 9); g.fill(); g.fillStyle = '#e8e0c8'; g.fillText(h.e + ' Sei nascosto ' + h.n + ' · muoviti per uscire', W2 / 2, H2 * 0.62); }
      if (me.jail) { g.fillStyle = 'rgba(30,34,44,.35)'; g.fillRect(0, 0, W2, H2); }
      // lampadari di cristallo della hall e del salone (accesi finche' il quadro non spegne il piano terra)
      if (mf === 0 && !darkAt(G, 40, 30)) for (const [x, y] of [[33.5, 36.5], [46.5, 36.5], [40, 15.5]]) if (near(x, y, 16)) chandelier(g, sx(x, y), sy(x, y) - TW * 4.4, TW, now);
      // gocce della fontana che cadono e brillano
      if (near(40, 43, 14)) { const U = TW * 0.575; for (let i = 0; i < 14; i++) { const k = (now * 0.9 + i / 14) % 1, a = i * 2.4, r = i % 2 ? 0.98 : 0.5, z = (i % 2 ? 1.2 : 1.85) * (1 - k) + (i % 2 ? 0.38 : 1.3) * k, X = sx(40 + Math.cos(a) * r, 43 + Math.sin(a) * r), Y = sy(40 + Math.cos(a) * r, 43 + Math.sin(a) * r) - z * U; g.fillStyle = 'rgba(220,245,255,' + (0.8 * (1 - k)) + ')'; g.fillRect(X - 1, Y - 2, 2, 3); } }
      // cambio di piano: si arriva dal nero, col nome del piano
      if (G.fade) { const t = performance.now() - G.fade;
        if (t < 520) { g.fillStyle = 'rgba(4,4,6,' + (1 - t / 520) + ')'; g.fillRect(0, 0, W2, H2); }
        if (t < 1700) { const a = Math.min(1, (1700 - t) / 400); g.globalAlpha = a; g.fillStyle = 'rgba(10,10,14,.7)'; cqRR(g, W2 / 2 - 90, H2 * 0.3 - 22, 180, 44, 12); g.fill(); g.fillStyle = '#f2dca0'; g.font = '800 20px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(['🏛️ ', '⬆️ ', '⬇️ '][mf] + FLN[mf].toUpperCase(), W2 / 2, H2 * 0.3); g.globalAlpha = 1; } }
      board(g, G); minimap(g, G, W2);
    }
  };
  // verso un punto, anche a un altro piano: se e' a un altro piano, il passaggio piu' vicino che ci porta (p = passaggio)
  function toward(x, y) {
    const a = floorOf(cq.x), b = floorOf(x); if (a === b) return { x, y };
    const hop = a === 0 ? b : 0; let best = null, bd = 1e9;
    for (const Pq of MP().portals) { if (Pq.f !== a || Pq.tf !== hop) continue; const c = Pq.cells[0], d = Math.hypot(c[0] + 0.5 - cq.x, c[1] + 0.5 - cq.y); const open = !MP().gates[Pq.k] || Pq.k === cq.g.plan.a; if (open && d < bd) { bd = d; best = c; } }
    return best ? { x: best[0] + 0.5, y: best[1] + 0.5, p: 1 } : { x, y };
  }
  // lampadario disegnato sopra a tutto (e' una luce): anello d'oro, gocce di cristallo che brillano
  function chandelier(g0, X0, Y0, TW, t) {
    const k = Math.round(TW) + ':' + ((t * 3 | 0) % 5), C = chandelier.c || (chandelier.c = {}), dp = cq.dpr || 1;
    if (!C[k]) { if (Object.keys(C).length > 12) for (const q in C) delete C[q]; const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(TW * 3.4 * dp); const g = cv.getContext('2d'); g.scale(dp, dp); chandel0(g, TW * 1.7, TW * 1.7, TW, t); C[k] = cv; }
    g0.drawImage(C[k], X0 - TW * 1.7, Y0 - TW * 1.7, TW * 3.4, TW * 3.4);
  }
  function chandel0(g, X, Y, TW, t) {
    const r = TW * 0.55; g.strokeStyle = 'rgba(140,120,70,.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X, Y - TW * 1.65); g.lineTo(X, Y - r * 0.3); g.stroke();
    const gr = g.createRadialGradient(X, Y, 0, X, Y, TW * 1.6); gr.addColorStop(0, 'rgba(255,225,160,.35)'); gr.addColorStop(1, 'rgba(255,225,160,0)'); g.fillStyle = gr; g.beginPath(); g.arc(X, Y, TW * 1.6, 0, 7); g.fill();
    g.strokeStyle = '#c8a040'; g.lineWidth = Math.max(2, TW / 18); g.beginPath(); g.ellipse(X, Y, r, r * 0.4, 0, 0, 7); g.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, x = X + Math.cos(a) * r, y = Y + Math.sin(a) * r * 0.4; g.fillStyle = (i + (t * 3 | 0)) % 5 ? '#e8f6ff' : '#ffffff'; g.beginPath(); g.ellipse(x, y + TW * 0.12, TW * 0.035, TW * 0.08, 0, 0, 7); g.fill(); g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(x, y - TW * 0.05, TW * 0.03, 0, 7); g.fill(); }
    g.fillStyle = '#d8b850'; g.beginPath(); g.ellipse(X, Y + TW * 0.05, r * 0.35, r * 0.18, 0, 0, 7); g.fill();
  }
  // le guardie si vedono SEMPRE (abbastanza vicine allo schermo): niente comparse e sparizioni
  function guardSeen(G, gd) { return Math.abs(gd.x - cq.x) < SEE_G && Math.abs(gd.y - cq.y) < SEE_G && floorOf(gd.x) === floorOf(cq.x); }
  // la guardia notturna un po' brilla (personaggio del gioco), stesa a terra se stordita
  const GLOOK = { skin: 'guardia', col: '#4a5f8a', hat: 'nessuno' };
  function guardDraw(g, X, Y, TW, gd) {
    const f = Math.cos(gd.a) - Math.sin(gd.a) >= 0 ? 1 : -1;
    if (gd.st !== 'ko') { cqPlayer(g, X, Y, TW, GLOOK, gd.walk, f); return; }
    g.save(); g.translate(X - f * TW * 0.55, Y - TW * 0.12); g.rotate(f * Math.PI / 2); cqPlayer(g, 0, 0, TW, GLOOK, 0, f, true); g.restore();
    const t = performance.now() / 300; g.font = Math.round(TW * 0.34) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💫', X - f * TW * 0.5 + Math.cos(t) * TW * 0.25, Y - TW * 0.9 + Math.sin(t) * 3);
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
    const A = { asc: '🛗 <b>Ascensore di servizio</b> (piano terra, nella galleria accanto al bar). Scala antincendio e montacarichi stanotte sono chiusi.<br>Serve 💳 <b>il badge del direttore</b>: nella sua giacca al guardaroba (piano terra), sul comodino della sua camera (primo piano, cartello «Non disturbare») oppure in tasca a una guardia (stordiscila e frugala).' + it('badge'),
      sca: '🚪 <b>Scala antincendio</b> (piano terra, in fondo al bar). Ascensore e montacarichi stanotte sono chiusi.<br>Serve 🔑 <b>la chiave della scala</b>: nel cassetto della reception (hall) o nello stanzino del custode (zona del personale).' + it('kSca'),
      mon: '📦 <b>Montacarichi delle cucine</b> (piano terra). Ascensore e scala antincendio stanotte sono chiusi.<br>Serve 🔑 <b>la chiavetta dello chef</b>: nel suo armadietto (spogliatoio) o sul bancone della cucina.' + it('kMon') }[pl.a];
    const B = pl.b === 'tas' ? '🔢 <b>Tastierino</b>: serve il codice. ' + { post: 'Il direttore l\'ha scritto su un post-it sulla scrivania del suo ufficio (primo piano).', split: 'Le prime due cifre sono nell\'agenda della segretaria, le ultime due nella cassaforte della camera del direttore («Non disturbare»): tutte e due al primo piano.', mon: 'Rivedete la registrazione ai monitor della sala della sicurezza (piano terra, zona del personale): si vede il direttore che lo digita.' }[pl.bc] + ' Codice: <b>' + codeTxt(G) + '</b> (sbagliarlo fa rumore!)'
      : pl.b === 'imp' ? '🖐️ <b>Lettore d\'impronta</b>: serve l\'impronta del direttore, sul suo bicchiere al bancone del bar (piano terra) o sulla tazzina nel suo ufficio (primo piano).' + it('imp')
      : '🗝️ <b>Doppia serratura</b>: due chiavi, una di sopra (scaffale dell\'ufficio del direttore al primo piano, armadietto dello spogliatoio o scaffale del custode al piano terra) e una nell\'interrato (lavatrice o scaffale dei vini). Vanno girate INSIEME, da due ladri, una a sinistra e una a destra della porta.' + it('kA') + it('kB');
    const C = pl.c === 'las' ? '🔴 <b>Laser</b> intorno alla teca: spegneteli dal quadro elettrico nel locale tecnico (piano terra, zona del personale). Una guardia andrà a controllare.' + (G.lz ? ' — ✅ spenti' : '')
      : pl.c === 'pes' ? '⚖️ <b>Sensore di peso</b>: serve il diamante finto, nella vetrina della boutique (piano terra).' + it('fake')
      : '🎛️ <b>Cassaforte a combinazione</b>: va ascoltata con calma (12 s fermi, e ogni 3 s fa rumore).' + (G.cb ? ' — ✅ aperta' : '');
    cqCloseTask(); $('#tkTitle').textContent = '📋 Il colpo di stanotte';
    $('#tkBody').innerHTML = `<p class="lead" style="text-align:left;font-size:14px;line-height:1.5">1) ${A}</p><p class="lead" style="text-align:left;font-size:14px;line-height:1.5">2) ${B}</p><p class="lead" style="text-align:left;font-size:14px;line-height:1.5">3) ${C}</p><p class="lead" style="text-align:left;font-size:14px;line-height:1.5">4) 🚐 Portate il diamante al furgone: stanotte vi aspetta nel <b>${ENT[pl.e].toLowerCase()}</b>, ${ENTD[pl.e]}.</p><p class="hint">🪜 Lo scalone della hall porta al primo piano; c'è anche la scala di servizio, in fondo alla zona del personale. ⭐ Le stelline indicano i posti da frugare. Se vi prendono finite in cella (sala della sicurezza, piano terra) e perdete quello che avete in tasca. 🐾 Di base cammini piano (silenzioso); 🏃 correre fa rumore e le guardie vicine vengono a vedere. Nell'ombra una guardia ti vede solo da vicino con la torcia (cono forte), sotto una lampada da lontano (cono leggero). 🪙 monetina: distrae le guardie. 👊 alle spalle di una guardia: la stordisci. ⚡ quadro elettrico: luci di un'ala spente per ${DARK_T} s.</p>`;
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
    $('#tkBody').innerHTML = `<p class="lead">Spegni le luci di un piano per ${DARK_T} secondi: le guardie vedono meno e le telecamere si spengono. Ma una guardia verrà a controllare il quadro!</p>${Object.keys(ALA).map(a => `<button type="button" class="big" data-o="${a}" ${ok(a) ? '' : 'disabled'} style="display:block;width:100%;margin:6px 0">💡 ${ALA[a]}${ok(a) ? '' : ' (non ancora)'}</button>`).join('')}${G.plan.c === 'las' && !G.lz ? '<button type="button" class="big" data-o="L" style="display:block;width:100%;margin:10px 0 6px;background:#8a2a2a;color:#fff">🔴 Spegni i laser della teca</button>' : ''}`;
    $('#tkHint').textContent = ''; $('#tkClose').hidden = false; $('#cqTask').hidden = false; $('#tkClose').onclick = () => cqCloseTask();
    $('#tkBody').querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = b.dataset.o, G2 = cq.g; cqCloseTask(); if (!G2 || G2.mode !== 'colpo') return; if (G2.guest) cqNetSend({ k: 'a', a: 'quad', o }); else doAct(G2, G2.me, { k: 'quad', o }); thud(0.5, 120); });
  }
  // evasione: grimaldello a tempo (3 colpi nella zona verde; uno sbagliato = allerta)
  // EVASIONE: serratura a 4 perni colorati da spingere nell'ordine giusto. Sul muro della cella gli indizi graffiati dai vecchi prigionieri
  // portano a una sola soluzione (si ragiona, non si tira a indovinare). UN SOLO TENTATIVO: se sbagli scatta l'allerta.
  const PIN = [['🔴', 'rosso'], ['🔵', 'blu'], ['🟢', 'verde'], ['🟡', 'giallo']], ORD = ['primo', 'secondo', 'terzo', 'quarto'];
  function lockPuzzle() {
    const perms = []; (function pm(a, r) { if (!r.length) { perms.push(a); return; } r.forEach((v, i) => pm(a.concat(v), r.filter((_, j) => j !== i))); })([], [0, 1, 2, 3]);
    const sol = perms[Math.floor(Math.random() * perms.length)], N = c => 'il ' + PIN[c][1];
    const all = [];
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (a !== b) { all.push({ t: cap(N(a)) + ' viene prima del ' + PIN[b][1], f: s => s.indexOf(a) < s.indexOf(b) }); all.push({ t: 'Subito dopo ' + N(a) + ' c\'è ' + N(b), f: s => s.indexOf(b) === s.indexOf(a) + 1 }); }
    for (let a = 0; a < 4; a++) for (let i = 0; i < 4; i++) all.push({ t: cap(N(a)) + ' non è il ' + ORD[i], f: s => s.indexOf(a) !== i });
    const ok = all.filter(c => c.f(sol)).sort(() => Math.random() - 0.5), used = [];
    const fits = L => perms.filter(p => L.every(c => c.f(p))).length;
    for (const c of ok) { if (fits(used) === 1) break; if (fits(used.concat(c)) < fits(used)) used.push(c); }
    for (let i = used.length - 1; i >= 0; i--) { const L = used.filter((_, j) => j !== i); if (fits(L) === 1) used.splice(i, 1); }   // niente indizi inutili
    return { sol, clues: used.map(c => c.t) };
  }
  function lockUI(G) {
    cqCloseTask(); const P0 = lockPuzzle(); let pick = [], done = false;
    $('#tkTitle').textContent = '🔓 Evasione: la serratura a perni';
    const draw = () => {
      $('#lkS').innerHTML = [0, 1, 2, 3].map(i => '<span style="display:inline-block;width:46px;height:46px;line-height:46px;margin:3px;border-radius:10px;background:#2a2e36;font-size:26px">' + (pick[i] != null ? PIN[pick[i]][0] : '<small style="color:#8a90a0;font-size:13px">' + (i + 1) + '°</small>') + '</span>').join('');
      $('#tkBody').querySelectorAll('[data-p]').forEach(b => { b.disabled = pick.includes(+b.dataset.p) || done; });
      $('#lkGo').disabled = pick.length < 4 || done;
    };
    $('#tkBody').innerHTML = '<p class="lead" style="text-align:left">Spingi i 4 perni <b>nell\'ordine giusto</b>. Sul muro della cella, graffiati dai vecchi prigionieri:</p>'
      + '<div style="background:#3a3632;border-radius:10px;padding:10px 12px;margin:8px 0;font:italic 600 15px system-ui;color:#e8dcc0;line-height:1.6">' + P0.clues.map(t => '✎ «' + t + '»').join('<br>') + '</div>'
      + '<div id="lkS" style="text-align:center;margin:8px 0"></div><div style="text-align:center">' + PIN.map((p, i) => '<button type="button" class="big" data-p="' + i + '" style="width:64px;height:58px;margin:4px;font-size:28px">' + p[0] + '</button>').join('') + '</div>'
      + '<div class="mtAct" style="margin-top:10px"><button type="button" class="btn" id="lkC">↩ Cancella</button><button type="button" class="btn primary" id="lkGo">🔓 Gira (un solo tentativo!)</button></div><p class="hint" id="lkR">Se sbagli scatta l\'allerta e non puoi riprovare: dovranno liberarti i compagni.</p>';
    $('#tkHint').textContent = ''; $('#tkClose').hidden = false; $('#cqTask').hidden = false; $('#tkClose').onclick = () => cqCloseTask();
    $('#tkBody').querySelectorAll('[data-p]').forEach(b => b.onclick = () => { if (done || pick.length >= 4) return; pick.push(+b.dataset.p); beep(500 + pick.length * 120, 0.05, 0.03); thud(0.2, 400); draw(); });
    $('#lkC').onclick = () => { if (done) return; pick = []; draw(); };
    $('#lkGo').onclick = () => {
      if (done || pick.length < 4) return; done = true; $('#tkClose').hidden = true; const ok = pick.every((v, i) => v === P0.sol[i]);
      $('#lkR').innerHTML = ok ? '<b style="color:#7be0a0">🔓 Click… clack… APERTA! Esci in fretta!</b>' : '<b style="color:#ff7a6a">💥 Bloccata! Il clangore ha fatto scattare l\'allerta.</b> L\'ordine giusto era ' + P0.sol.map(i => PIN[i][0]).join(' ');
      if (ok) { beep(700, 0.08, 0.04); beep(900, 0.08, 0.04, 0.1); beep(1200, 0.2, 0.04, 0.2); } else beep(160, 0.4, 0.05, 0, 'sawtooth');
      draw(); setTimeout(() => cqCloseTask(), ok ? 1200 : 2600);
      const G2 = cq.g; if (!G2 || G2.mode !== 'colpo') return; if (G2.guest) cqNetSend({ k: 'a', a: 'ev', ok: ok ? 1 : 0 }); else doAct(G2, G2.me, { k: 'ev', ok });
    };
    draw();
  }
  window.__lockPuzzle = lockPuzzle; window.__route = route; window.__floorOf = floorOf; window.__needs = needSpots; window.__act = action;   // per le prove

  // ---- MAPPA: radar in alto a destra, grande toccandolo ----
  // un'immagine per piano (gli altri piani non ci sono: la mappa piccola mostra solo il piano dove sei)
  const FREG = [[0, 0, 80, 62], [96, 8, 60, 44], [172, 8, 60, 21]];   // x, y, larghezza, altezza di ogni piano
  function mapImg(f) {
    const M = MP(); M.mimg = M.mimg || []; if (M.mimg[f]) return M.mimg[f];
    const c = document.createElement('canvas'); c.width = W; c.height = H; const sg = c.getContext('2d', CQ_CPU), im = sg.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (floorOf(x) !== f) continue;
      const i = y * W + x, r = M.ROOM[i], fl = cqFloor[y] && cqFloor[y][x], s = cqSolid[y] && cqSolid[y][x];
      let col = null; if (fl) { const R = M.rooms[r >= 0 ? r : M.hall]; const h = parseInt(R.c[0].slice(1), 16); col = [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => Math.min(255, v * 1.15 + 18)); if (s && !s.wall) col = col.map(v => v * 0.7); } else if (s && s.wall) col = [60, 58, 56];
      if (!col) continue; d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    sg.putImageData(im, 0, 0); return (M.mimg[f] = c);
  }
  function mapDraw(g, G, X, Y, R, s, cx, cy, big) {
    const me = G.me, M = MP(), mf = floorOf(cq.x), img = mapImg(mf), now = performance.now(), on = x => floorOf(x) === mf;
    const P2 = (x, y) => [X + (x - cx - (y - cy)) * s * 0.7071, Y + (x - cx + (y - cy)) * s * 0.7071];
    g.save();
    g.fillStyle = 'rgba(10,12,16,.88)'; g.strokeStyle = '#c8a040'; g.lineWidth = 2.5; g.beginPath(); if (big) cqRR(g, X - R, Y - R, R * 2, R * 2, 16); else g.arc(X, Y, R, 0, 7); g.fill(); g.stroke();
    g.beginPath(); if (big) cqRR(g, X - R + 3, Y - R + 3, R * 2 - 6, R * 2 - 6, 14); else g.arc(X, Y, R - 2, 0, 7); g.clip();
    { const FR = FREG[mf], rr = big ? 1e9 : R / s + 2, ax = Math.max(FR[0], Math.floor(cx - rr)), ay = Math.max(FR[1], Math.floor(cy - rr)), bx = Math.min(FR[0] + FR[2], Math.ceil(cx + rr)), by = Math.min(FR[1] + FR[3], Math.ceil(cy + rr));   // solo il pezzo che si vede
      g.translate(X, Y); g.rotate(Math.PI / 4); g.scale(s, s); g.translate(-cx, -cy); g.imageSmoothingEnabled = false; g.globalAlpha = 0.9; if (bx > ax && by > ay) g.drawImage(img, ax, ay, bx - ax, by - ay, ax, ay, bx - ax, by - ay); g.globalAlpha = 1; g.setTransform(cq.dpr || 1, 0, 0, cq.dpr || 1, 0, 0); }
    const dot = (x, y, r, col, ring) => { if (!on(x)) return; const [a, b] = P2(x, y); g.fillStyle = col; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); if (ring) { g.strokeStyle = ring; g.lineWidth = 1.5; g.stroke(); } };
    const ico = (x, y, t, sz) => { if (!on(x)) return; const [a, b] = P2(x, y); g.font = sz + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, a, b); };
    const sz = big ? 13 : 10;
    for (const k of needSpots(G)) { const sp = spot(G, k); dot(sp.x + 0.5, sp.y + 0.5, big ? 4 : 3, 'rgba(255,240,170,' + (0.6 + 0.4 * Math.sin(now / 250)) + ')'); }
    if (conf(G).length) ico(M.SP.conf.x + 0.5, M.SP.conf.y + 0.5, '📦', sz);
    if (!G.o1) { const gt = M.gates[G.plan.a]; ico(gt.s[0], gt.s[1], gt.e, sz); }
    else if (!G.o3) ico(M.teca.x + 0.5, M.teca.y + 0.5, '💎', sz);
    if (G.plan.c === 'las' && !G.lz && G.o1) ico(M.SP.quadro.x + 0.5, M.SP.quadro.y + 0.5, '⚡', sz - 1);
    ico(vanP(G).x, vanP(G).y, '🚐', sz);
    // le scale: dove si cambia piano
    for (const Pq of M.portals) if (Pq.f === mf && (!M.gates[Pq.k] || Pq.k === G.plan.a)) { const c = Pq.cells[Math.floor(Pq.cells.length / 2)]; ico(c[0] + 0.5, c[1] + 0.5, Pq.tf === 1 ? '⬆️' : Pq.tf === 2 ? '⬇️' : mf === 1 ? '⬇️' : '⬆️', sz - 2); }
    if (G.chars.some(c => c.jail)) ico(M.jailIco[0], M.jailIco[1], '⛓️', sz);
    for (const gd of G.gd) dot(gd.x, gd.y, 3, gd.st === 'chase' ? '#ff3030' : gd.st === 'ko' ? '#888' : '#ff9a4a', '#000');
    for (const c of G.chars) if (c !== me && c.alive && !c.esc) dot(c.x, c.y, 3, c.jail ? '#9aa0a8' : TC, '#000');
    const [mx, my] = P2(cq.x, cq.y), wx = cq.wdx || 1, wy = cq.wdy || 0, ang = Math.atan2((wx + wy) * 0.7071, (wx - wy) * 0.7071);
    g.translate(mx, my); g.rotate(ang); g.fillStyle = '#ffffff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -5); g.lineTo(-2.5, 0); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  const RADAR = 66;
  // gli altri piani in breve: posti da frugare e compagni che ci sono
  function floorsTxt(G) {
    const mf = floorOf(cq.x), out = [];
    for (let f = 0; f < 3; f++) {
      if (f === mf) continue; const n = needSpots(G).filter(k => floorOf(spot(G, k).x) === f).length, p = G.chars.filter(c => c !== G.me && c.alive && !c.esc && floorOf(c.x) === f).length;
      const bits = [n ? '⭐' + n : '', p ? '🦹' + p : '', f === 2 && G.o1 && !G.o3 ? '💎' : '', f === 0 && G.o3 ? '🚐' : ''].filter(Boolean);
      out.push(['🏛️', '⬆️', '⬇️'][f] + ' ' + FLN[f] + (bits.length ? ': ' + bits.join(' ') : ''));
    }
    return out.join('  ·  ');
  }
  function minimap(g, G, W2) {
    const mf = floorOf(cq.x), FR = FREG[mf];
    if (G.big) { const H2 = cq.h, R = Math.min(W2 - 24, H2 - 300, 440) / 2, cy = Math.max(130 + R, H2 / 2 - 40); mapDraw(g, G, W2 / 2, cy, R, (R * 2 - 10) / ((FR[2] + FR[3]) * 0.7071), FR[0] + FR[2] / 2, FR[1] + FR[3] / 2, true);
      g.font = '800 14px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f2dca0'; g.fillText('Sei al ' + FLN[mf].toLowerCase(), W2 / 2, cy - R - 26);
      g.font = '600 12px system-ui,sans-serif'; g.fillStyle = 'rgba(230,236,255,.85)'; g.fillText(floorsTxt(G), W2 / 2, cy - R - 9); g.fillText('Tocca la mappa per chiuderla', W2 / 2, cy + R + 16); return; }
    mapDraw(g, G, W2 - RADAR - 8, 122 + RADAR, RADAR, 3.2, cq.x, cq.y, false);
    g.font = '700 10px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f2dca0'; g.fillText(['🏛️ Piano terra', '⬆️ Primo piano', '⬇️ Interrato'][mf], W2 - RADAR - 8, 122 + RADAR * 2 + 12);
    g.font = '600 10px system-ui,sans-serif'; g.fillStyle = 'rgba(230,236,255,.75)'; g.fillText('🗺️ tocca', W2 - RADAR - 8, 122 + RADAR * 2 + 25);
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
    st.textContent = '#hcCoin{position:absolute;left:18px;bottom:142px;width:78px;height:78px;border-radius:50%;border:0;font:inherit;font-weight:800;font-size:26px;background:#c8a040;color:#2a2010;box-shadow:0 4px 14px rgba(0,0,0,.35);touch-action:none;user-select:none;-webkit-user-select:none}#hcCoin.off{background:#5a5a66;color:#ccc}#hcCoin small{display:block;font-size:12px;line-height:1}'
      + '#hcRun{position:absolute;left:24px;bottom:232px;width:66px;height:66px;border-radius:50%;border:0;font:inherit;font-weight:800;font-size:24px;background:#3a4252;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.35);touch-action:none;user-select:none;-webkit-user-select:none}#hcRun.on{background:#c0582a}#hcRun small{display:block;font-size:10px;line-height:1}';
    document.head.appendChild(st);
  }
  const host = document.getElementById('ciack') || document.body;
  const mkBtn = (id, txt) => { let b = document.getElementById(id); if (!b) { b = document.createElement('button'); b.id = id; b.type = 'button'; b.hidden = true; b.innerHTML = txt; host.appendChild(b); } return b; };
  const runB = mkBtn('hcRun', '🐾'), coinB = mkBtn('hcCoin', '🪙'), mapB = mkBtn('hcMap', ''), boardB = mkBtn('hcBoard', '');
  const live = () => { const G = cq.g; return G && G.mode === 'colpo' && G.plan && G.phase === 'play' && G.pre <= 0 ? G : null; };
  function coinPress() {
    const G = live(); if (!G) return; const me = G.me; if (me.jail || me.hd || (me.coins || 0) <= 0) { beep(180, 0.05, 0.03); return; }
    // la monetina vola davanti a me (dove sto andando), fermata dai muri
    const dx = cq.wdx || 1, dy = cq.wdy || 0, m = Math.hypot(dx, dy) || 1; let r = 0.5; while (r < 5 && !GD.opaque(cq.x + dx / m * r, cq.y + dy / m * r)) r += 0.25; r = Math.max(0.5, r - 0.4);
    const x = cq.x + dx / m * r, y = cq.y + dy / m * r;
    if (G.guest) { cqNetSend({ k: 'a', a: 'coin', x, y }); me.coins--; } else doAct(G, me, { k: 'coin', x, y });
    beep(1500, 0.05, 0.03); beep(1900, 0.05, 0.02, 0.45);
  }
  const runSet = v => { cq.hcRun = v; beep(v ? 700 : 400, 0.05, 0.03); };
  runB.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); runSet(!cq.hcRun); });
  coinB.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); coinPress(); });
  mapB.onclick = e => { e.stopPropagation(); const G = live(); if (G) { G.big = !G.big; beep(G.big ? 700 : 500, 0.05, 0.02); } };
  boardB.onclick = e => { e.stopPropagation(); const G = live(); if (G) planUI(G); };
  if (!window.hcKeys) { window.hcKeys = 1; document.addEventListener('keydown', e => { if (e.repeat) return; const G = live(); if (!G || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return; const k = e.key.toLowerCase(); if (k === 'q') coinPress(); else if (k === 'r') runSet(!cq.hcRun); else if (k === 'm') G.big = !G.big; else if (k === 'l') planUI(G); }); }
  (function loop() {
    requestAnimationFrame(loop);
    const G = live(), panel = !$('#cqTask').hidden, me = G && G.me;
    const cOn = !!(G && !me.jail && !panel && !G.big);
    if (coinB.hidden === cOn) coinB.hidden = !cOn; if (runB.hidden === cOn) runB.hidden = !cOn;
    if (cOn) { const t = cq.hcRun ? '🏃<small>corri</small>' : '🐾<small>piano</small>'; if (runB.dataset.t !== t) { runB.dataset.t = t; runB.innerHTML = t; runB.classList.toggle('on', !!cq.hcRun); } }
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
