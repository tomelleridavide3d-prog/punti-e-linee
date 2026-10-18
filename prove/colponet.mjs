// Colpo all'hotel online: host + amico (node prove/cdp2.mjs . prove/colponet.mjs). L'amico fa tutto il colpo; guardie ferme tranne quella che lo prende.
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.plan) return '${who}: niente partita'; const a = G.chars.find(c => c.name === 'zzAmico'); return '${who}: piano ' + G.plan.a + '/' + G.plan.b + '/' + G.plan.c + ' | tappe ' + [G.o1, G.o2, G.o3].join('') + ' laser spenti ' + G.lz + ' codice ' + G.ck.join('') + ' | oggetti ' + G.it.map(i => i.k + ':' + i.st + '/' + i.c).join(' ') + ' | amico cella ' + a.jail + ' a ' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ' | guardie ' + G.gd.length + ' prima a ' + G.gd[0].x.toFixed(1) + ',' + G.gd[0].y.toFixed(1) + ' | piano ' + ['terra', 'primo', 'interrato'][__floorOf(cq.x)] + ' | porte scala ' + !cqSolid[10][13] + ' caveau ' + !cqSolid[16][202] + ' cella ' + !cqSolid[46][65] + ' | ' + $('#cqModeBar').textContent; })()`;
const go = (x, y, who) => `(() => { cq.x = ${x}; cq.y = ${y}; return '${who} in ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1); })()`;
// accanto a un posto da frugare (SP) e passaggio tra piani (entro nella casella: il gioco mi porta di sopra o di sotto)
const goSp = (k, who) => `(() => { const s = CQ_MAP.SP['${k}'], q = cqSpot(s.x, s.y); cq.x = q.x; cq.y = q.y; return '${who} accanto a ${k} ' + q.x + ',' + q.y; })()`;
const stairs = (x, y, who) => `(async () => { const f0 = __floorOf(cq.x); cq.x = ${x}; cq.y = ${y}; await new Promise(r => setTimeout(r, 400)); return '${who}: dal piano ' + f0 + ' al piano ' + __floorOf(cq.x) + ' (arrivo ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ')'; })()`;
const btn = who => `(() => { const G = cq.g, b = G.M.btn(G); cqMyKill(); return '${who}: ' + JSON.stringify(b); })()`;
const last = who => `(() => '${who}: ' + __T.slice(-2).join(' / '))()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'colpo' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { colpo: { time: 600, dif: 'n', map: 'grandhotel', n: 3, fill: true } }); cqNetList(); return 'host: set aperto, gioco colpo'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set: ' + $('#hlInfo').textContent.slice(0, 60); })()`, 500],
  // partita col colpo deciso: scala antincendio (chiave alla reception), tastierino (post-it), laser
  [0, `(async () => { window.__PLAN = { a: 'sca', b: 'tas', bc: 'post', c: 'las' }; cqNewMatch(); await new Promise(r => setTimeout(r, 3000)); const G = cq.g; G.pre = 0; G.it[0].s = 'recep';
    G.gd.forEach((g, i) => { g.x = 30.5 + i * 2; g.y = 16.5; g.st = 'ko'; g.ko = 1e9; g.found = 1; g.path = []; });
    for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; c.x = 64.5; c.y = 30.5; } return 'host: partita ' + G.mode + ', mappa ' + cq.map + ', guardie ' + G.gd.length; })()`, 2500],
  [1, `(() => { const G = cq.g; return 'amico: partita ' + (G && G.mode) + ' piano ' + (G.plan && G.plan.a) + ' | lavagna visibile ' + !$('#hcBoard').hidden + ' monetina ' + !$('#hcCoin').hidden + ' | guardie ' + G.gd.length + ' | ' + $('#cqModeBar').textContent; })()`, 0],
  // chiave nel cassetto della reception
  [1, goSp('recep', 'amico'), 700], [1, btn('amico'), 2800], [0, last('host'), 0], [1, last('amico'), 0],
  // monetina
  [1, `(() => { $('#hcCoin').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'amico: monetina lanciata, ne restano ' + cq.g.me.coins; })()`, 1200],
  [0, `(() => 'host: monetine in terra ' + cq.g.cn.length + ' | amico ne ha ' + cq.g.chars.find(c => c.name === 'zzAmico').coins)()`, 0],
  // scala antincendio
  [1, go(14.5, 10.5, 'amico'), 700], [1, btn('amico'), 2300], [0, st('host'), 0], [1, st('amico'), 0],
  // giu' dalla scala antincendio e di nuovo su; poi lo scalone fino al primo piano
  [1, stairs(11.5, 10.5, 'amico'), 300], [1, stairs(173.5, 9.5, 'amico'), 300], [1, `(async () => { cq.x = 16.5; cq.y = 13.5; await new Promise(r => setTimeout(r, 300)); return 'amico nel bar'; })()`, 0], [1, stairs(39.5, 24.5, 'amico'), 300],
  // post-it del direttore
  [1, goSp('postit', 'amico'), 700], [1, btn('amico'), 2800], [1, last('amico'), 0],
  // tastierino (come se lo digitasse nel pannello)
  [1, go(201.5, 15.5, 'amico'), 700], [1, `(() => { const G = cq.g, b = G.M.btn(G); cqNetSend({ k: 'a', a: 'kpv', v: G.plan.code }); return 'amico: ' + JSON.stringify(b) + ' digito ' + G.plan.code; })()`, 1500],
  // quadro elettrico: laser e luci del piano terra
  [1, goSp('quadro', 'amico'), 700], [1, `(() => { cqNetSend({ k: 'a', a: 'quad', o: 'L' }); cqNetSend({ k: 'a', a: 'quad', o: 'T' }); return 'amico: laser e luci'; })()`, 1500],
  [0, st('host'), 0], [1, last('amico'), 0],
  // teca: prendo il diamante
  [1, go(201.5, 23.5, 'amico'), 700], [1, btn('amico'), 2800], [0, st('host'), 0], [1, last('amico'), 0],
  // una guardia prende l'amico: in cella, diamante confiscato
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAmico'), g = G.gd[1]; g.st = 'chase'; g.tgt = a.id; g.x = a.x + 0.3; g.y = a.y; g.ko = 0; g.path = []; return 'host: guardia addosso all amico'; })()`, 1500],
  [0, `(() => { const G = cq.g; G.gd[1].st = 'ko'; G.gd[1].ko = 1e9; return 'host: guardia di nuovo ferma'; })()`, 800],
  [1, `(() => 'amico: io in cella ' + cq.g.me.jail + ' posizione ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' | pulsante ' + $('#cqKill').textContent + ' | ' + __T.slice(-1)[0])()`, 0], [0, st('host'), 0],
  // l'host scassina la cella
  [0, go(66.0, 45.3, 'host'), 300], [0, btn('host'), 4800],
  [1, `(() => { cq.x = 64.5; cq.y = 44.5; return 'amico: cella aperta ' + !cqSolid[46][65] + ', esco | ' + __T.slice(-1)[0]; })()`, 800],
  // armadio delle confische
  [1, goSp('conf', 'amico'), 700], [1, btn('amico'), 2800], [0, st('host'), 0],
  // al furgone
  [1, `(() => { const v = CQ_MAP.ents[cq.g.plan.e].van; cq.x = v.x; cq.y = v.y; return 'amico al furgone: ' + ['principale', 'vicolo', 'giardino', 'personale'][cq.g.plan.e]; })()`, 3500],
  [0, `(() => 'host: ' + (cq.g.phase) + ' | ' + ($('#tkBody .lead') ? $('#tkBody .lead').textContent.slice(0, 120) : '-'))()`, 0],
  [1, `(() => 'amico: ' + (cq.g.phase) + ' | ' + ($('#tkBody .lead') ? $('#tkBody .lead').textContent.slice(0, 120) : '-'))()`, 0],
  [0, `(() => 'errori host: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'))()`, 0],
  [1, `(() => 'errori amico: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'))()`, 0],
  [0, `(async () => { cqNetKill && cq.net && cqNetKill(cq.net.code); return 'set chiuso'; })()`, 1000]
];
