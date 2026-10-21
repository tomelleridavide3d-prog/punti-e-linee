// Evasione passo 3 online: l'amico scappa dal tunnel, lancia la corda; l'host si arrampica; camion visto da tutti e due; vittoria (node prove/cdp2.mjs . prove/evanet3.mjs)
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' }); try { localStorage.setItem('evHelpN', '9'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const am = `cq.g.chars.find(c => c.name === 'zzAmico')`;
const last = who => `(() => '${who}: ' + __T.slice(-2).join(' / '))()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'evasione' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { evasione: { dif: 'n', map: 'carcere', n: 4, fill: true } }); cqNetList(); return 'host: set aperto'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 4000)); const G = cq.g; G.psL = []; G.camL = []; window.__park = setInterval(() => G.gd.forEach((g, i) => { g.x = 164 + i; g.y = 59.5; g.st = 'pat'; g.path = []; g.wait = 1e9; g.sus = 0; }), 200); G.time = 175; G.pc = 175; const a = ${am}; G.tun[a.cell] = 2; return 'host: notte, tunnel della cella dell amico finito'; })()`, 2500],
  [1, `(() => { const G = cq.g, h = CQ_MAP.cells[G.me.cell].hole; cq.x = h[0]; cq.y = h[1]; return 'amico al buco'; })()`, 1200],
  [1, `(() => { const G = cq.g, b = G.M.btn(G); G.M.act(G); return 'amico: ' + (b && b.t); })()`, 2500],
  [0, `(() => { const a = ${am}; return 'host: amico fuori ' + a.out + ' a ' + a.x.toFixed(1) + ',' + a.y.toFixed(1); })()`, 0],
  [1, `(() => 'amico: fuori ' + cq.g.me.out + ' a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' · scritta: ' + cq.g.M.big(cq.g) + ' · ' + __T.slice(-1)[0])()`, 0],
  // giorno: l'amico lancia la corda dal bosco
  [0, `(() => { const G = cq.g; G.time = 260; G.pc = 10; ${am}.pk = ['le']; return 'host: giorno 2, lenzuolo all amico'; })()`, 1500],
  [1, `(() => { cq.x = 30.5; cq.y = 3.4; return 'amico al muro'; })()`, 1200],
  [1, `(() => { const G = cq.g, b = G.M.btn(G); G.M.act(G); return 'amico: ' + (b && b.t); })()`, 2000],
  [0, `(() => 'host: corde ' + cq.g.rope.length)()`, 0], [1, `(() => 'amico: corde ' + cq.g.rope.length)()`, 0],
  // l'host scavalca la rete e si arrampica
  [0, `(async () => { const G = cq.g, r = G.rope[0]; cq.x = r.ix; cq.y = r.iy + 0.3; await new Promise(q => setTimeout(q, 300)); const b = G.M.btn(G); G.M.act(G); await new Promise(q => setTimeout(q, 3500)); return 'host: ' + (b && b.t) + ' -> fuori ' + G.me.out; })()`, 1500],
  [1, last('amico'), 0],
  // il camion: lo vedono tutti e due
  [0, `(() => { const G = cq.g; G.cam = { T: G.time + 5, st: 0 }; return 'host: arriva il camion'; })()`, 7000],
  [1, `(() => { const G = cq.g; return 'amico: camion fase ' + window.__ev.camPh(G).ph + ' caselle occupate ' + !!cqSolid[40][87]; })()`, 0],
  // vittoria: i compagni del computer escono
  [0, `(() => { const G = cq.g; for (const c of G.chars) if (!c.out) window.__ev.escapeC(G, c, 'cam', 88, 74.5, { nf: 1 }); return 'host: tutti fuori'; })()`, 3000],
  [0, `(() => 'host fine: ' + $('#tkTitle').textContent + ' · ' + $('#tkBody').textContent.slice(0, 120))()`, 0],
  [1, `(() => 'amico fine: ' + $('#tkTitle').textContent + ' · ' + $('#tkBody').textContent.slice(0, 120))()`, 0],
  [0, `(() => 'host errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`, 0],
  [1, `(() => 'amico errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`, 0]
];
