// Evasione passo 2 online: l'amico ruba, nasconde nella piastrella, fa il fantoccio; perquisizione vista da tutti (node prove/cdp2.mjs . prove/evanet2.mjs)
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
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 4000)); const G = cq.g; G.time = 40; G.pc = 40; G.psL = []; window.__park = setInterval(() => G.gd.forEach((g, i) => { g.x = 164 + i; g.y = 59.5; g.st = 'pat'; g.path = []; g.wait = 1e9; g.sus = 0; }), 200); return 'host: partita, guardie parcheggiate'; })()`, 2500],
  // l'amico ruba il cucchiaio e gli stracci
  [1, `(() => { cq.x = 68.5; cq.y = 12.5; return 'amico in mensa'; })()`, 800],
  [1, `(() => { const G = cq.g, b = G.M.btn(G); G.M.act(G); return 'amico pulsante: ' + (b && b.t); })()`, 1200],
  [1, `(() => { cq.x = 78.5; cq.y = 28.5; return 'amico in lavanderia'; })()`, 800],
  [1, `(() => { const G = cq.g; G.M.act(G); return 'amico ruba'; })()`, 1500],
  [0, `(() => 'host vede in tasca all amico: ' + ${am}.pk.join(','))()`, 0],
  [1, `(() => 'amico vede in tasca: ' + cq.g.me.pk.join(',') + ' · ' + __T.slice(-1)[0])()`, 0],
  // nasconde il cucchiaio nella piastrella della sua cella, poi fa il fantoccio
  [1, `(() => { const G = cq.g, S = CQ_MAP.stash[CQ_MAP.cells[G.me.cell].st]; cq.x = S.x + 0.5; cq.y = S.y + 0.5; return 'amico alla piastrella'; })()`, 1000],
  [1, `(() => { const G = cq.g; G.M.act(G); const b = document.querySelector('#evSt button[data-a=put][data-it=cu]'); b && b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return 'amico nasconde: pannello ' + !$('#evSt').hidden; })()`, 1800],
  [0, `(() => { const G = cq.g, a = ${am}; return 'host: piastrella [' + G.st[CQ_MAP.cells[a.cell].st].join(',') + '] tasca amico [' + a.pk.join(',') + ']'; })()`, 0],
  [1, `(() => { const G = cq.g; return 'amico: piastrella [' + G.st[CQ_MAP.cells[G.me.cell].st].join(',') + '] pannello: ' + $('#evSt').textContent.slice(0, 70); })()`, 0],
  [1, `(() => { const G = cq.g, s = CQ_MAP.cells[G.me.cell].sp[G.me.slot]; cq.x = s[0]; cq.y = s[1]; return 'amico al letto'; })()`, 1000],
  [1, `(() => { const G = cq.g, b = G.M.btn(G); G.M.act(G); return 'amico: ' + (b && b.t); })()`, 1800],
  [0, `(() => 'host: fantoccio amico ' + ${am}.dm + ' · branda ' + JSON.stringify(cqSolid[CQ_MAP.cells[${am}.cell].y0 === 9 ? 10 : 30][CQ_MAP.cells[${am}.cell].x0].o.dm))()`, 0],
  [1, `(() => 'amico: branda ' + JSON.stringify(cqSolid[CQ_MAP.cells[cq.g.me.cell].y0 === 9 ? 10 : 30][CQ_MAP.cells[cq.g.me.cell].x0].o.dm))()`, 0],
  // perquisizione della cella dell'amico: lo sanno tutti e due
  [0, `(() => { const G = cq.g, a = ${am}; clearInterval(window.__park); G.gd.forEach(g => g.wait = 0); const gb = G.gd.find(g => g.route === CQ_MAP.routes.braccio.route); gb.x = 30.5; gb.y = 20.5; window.__ev.psStart(G, G.time + 3); G.ps.k = a.cell; G.ps.h = CQ_MAP.cells[a.cell].st; return 'host: perquisizione'; })()`, 2000],
  [1, `(() => 'amico: scritta grande: ' + cq.g.M.big(cq.g) + ' · ' + __T.slice(-1)[0])()`, 0],
  [0, `(async () => { const G = cq.g; for (let i = 0; i < 40 && G.ps && G.ps.st < 2; i++) await new Promise(r => setTimeout(r, 500)); return 'host: perquisizione ' + (G.ps ? G.ps.st : 'finita'); })()`, 1500],
  [1, last('amico'), 0], [0, last('host'), 0],
  [0, `(() => 'host errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`, 0],
  [1, `(() => 'amico errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`, 0]
];
