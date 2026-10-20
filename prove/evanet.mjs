// Evasione online: host + amico (node prove/cdp2.mjs . prove/evanet.mjs). Appello, zona vietata, presa, isolamento, sbarre di notte, dormire.
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' }); try { localStorage.setItem('evHelpN', '9'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || G.mode !== 'evasione') return '${who}: niente partita'; const a = G.chars.find(c => c.name === 'zzAmico'); return '${who}: ora ' + __ev.clock(G) + ' fase ' + __ev.phase(G) + ' | amico N°' + a.no + ' cella ' + a.cell + ' iso ' + Math.max(0, Math.round(a.iso - G.time)) + ' ric ' + Math.max(0, Math.round(a.ric - G.time)) + ' a ' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ' | guardie ' + G.gd.length + ' (' + G.gd.map(g => g.st).join(',') + ') | sbarre chiuse ' + !!cqSolid[13][20] + ' | io a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' | ' + $('#cqModeBar').textContent + ' | ' + $('#cqCount').textContent; })()`;
const last = who => `(() => '${who}: ' + __T.slice(-2).join(' / '))()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'evasione' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { evasione: { dif: 'n', map: 'carcere', n: 4, fill: true } }); cqNetList(); return 'host: set aperto, gioco evasione'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set: ' + $('#hlInfo').textContent.slice(0, 60); })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 3500)); const G = cq.g; return 'host: partita ' + G.mode + ', mappa ' + cq.map + ', guardie ' + G.gd.length; })()`, 2500],
  [1, st('amico'), 0], [0, st('host'), 0],
  // l'amico non va all'appello: alla conta diventa ricercato (l'host salta a fine appello)
  [0, `(() => { const G = cq.g; G.time = 26.5; G.pc = 26.5; for (const c of G.chars) if (c.bot) { const s = CQ_MAP.spots[c.no - 1]; c.x = s[0]; c.y = s[1]; c.path = []; } const s = CQ_MAP.spots[G.me.no - 1]; cq.x = s[0]; cq.y = s[1]; return 'host al posto'; })()`, 3000],
  [1, st('amico'), 0], [1, last('amico'), 0], [0, last('host'), 0],
  // l'amico entra nella sala delle guardie, davanti a una guardia: lo inseguono e lo prendono
  [0, `(() => { const G = cq.g, g = G.gd[0]; g.x = 56.5; g.y = 52.5; g.a = 0; g.st = 'pat'; g.path = []; g.wait = 99; g.route = [[56.5, 52.5, 99, 0]]; g.ri = 0; return 'host: guardia nella sala'; })()`, 300],
  [1, `(() => { cq.x = 57.6; cq.y = 52.5; return 'amico nella sala delle guardie'; })()`, 5000],
  [1, st('amico'), 0], [1, last('amico'), 0], [0, st('host'), 0],
  // di notte: le sbarre si chiudono anche sul telefono dell'amico; tutti a letto -> si dorme
  [0, `(() => { const G = cq.g; for (const c of G.chars) { c.iso = 0; c.ric = 0; } G.time = 168; G.pc = 168; for (const c of G.chars) if (c.bot) { const s = CQ_MAP.cells[c.cell].sp[c.slot]; c.x = s[0]; c.y = s[1]; c.path = []; } const s = CQ_MAP.cells[G.me.cell].sp[G.me.slot]; cq.x = s[0]; cq.y = s[1]; G.me.zz = 1; return 'host: notte, a letto'; })()`, 2500],
  [1, `(() => { const G = cq.g, me = G.me, s = CQ_MAP.cells[me.cell].sp[me.slot]; cq.x = s[0]; cq.y = s[1]; me.zx = null; return 'amico in cella'; })()`, 1500], [1, `(() => { const G = cq.g, b = G.M.btn(G); cqMyKill(); return 'amico: pulsante ' + JSON.stringify(b); })()`, 2500],
  [0, `(() => { const G = cq.g; return 'host: si dorme ' + G.ff + ' amico zz ' + G.chars.find(c => c.name === 'zzAmico').zz + ' ora ' + __ev.clock(G); })()`, 0],
  [1, st('amico'), 0],
  [0, `(() => 'host errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`, 0],
  [1, `(() => 'amico errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`, 0]
];
