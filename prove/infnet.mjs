// Infezione online (23-10-2026): host + amico (node prove/cdp2.mjs . prove/infnet.mjs). Partita zombie; la rete dell'amico si inceppa con uno zombie
// del computer addosso: non deve diventare zombie (protezione anti-lag); tornata la rete lo zombie lo prende e l'amico lo vede subito
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.eco = false; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'infezione' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { infezione: { v: 'zombie', time: 300, map: CQ_MODES.infezione ? CQ_MODES.infezione.maps[0][0] : 'studio', n: 4, fill: true } }); cqNetList(); return 'host: party aperto, gioco infezione'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel party'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 3500)); const G = cq.g; G.pre = 0; G.time = 10;
    for (const c of G.chars) { c.z = false; if (c.bot) { c.think = 1e9; c.path = []; } } const z = G.chars.find(c => c.bot); z.z = true; z.zt = -1; window.__Z = z.id;
    return 'host: partita ' + G.mode + ' (' + G.v + '), zombie ' + z.name; })()`, 1500],
  [1, `(() => { cqCloseTask(); window.__JT = 0; clearInterval(window.__JI); window.__JI = setInterval(() => { if (!window.__JT && cq.g && cq.g.me.z) window.__JT = Date.now(); }, 10); return 'amico: partita ' + cq.g.mode + ', zombie ' + !!cq.g.me.z; })()`, 0],
  // rete inceppata dell'amico
  [1, `(() => { const p0 = window.cqNetPut; window.__P0 = p0; window.cqNetPut = (p, v) => { if (!/\\/pos\\//.test(p)) p0(p, v); }; return 'amico: rete inceppata in ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1); })()`, 0],
  [0, `(async () => { await new Promise(r => setTimeout(r, 1200)); cqCloseTask(); const G = cq.g, c = G.chars.find(o => o.remote), z = G.chars.find(o => o.id === window.__Z);
    const lag = cqLagging(c); z.x = c.x + 0.2; z.y = c.y; z.path = [];
    window.__CT = 0; clearInterval(window.__CI); window.__CI = setInterval(() => { if (!window.__CT && c.z) window.__CT = Date.now(); z.x = c.x + 0.2; z.y = c.y; }, 10);
    await new Promise(r => setTimeout(r, 700));
    return 'host: amico in ritardo ' + lag + ', zombie addosso, dopo 0,7 s contagiato: ' + !!c.z; })()`, 0],
  [1, `(() => { window.cqNetPut = window.__P0; return 'amico: rete tornata'; })()`, 2500],
  [0, `(() => { const c = cq.g.chars.find(o => o.remote); return 'host: in ritardo ' + cqLagging(c) + ', zombie ' + !!c.z + ' (alle ' + (window.__CT % 100000) + ')'; })()`, 0],
  [1, `(() => 'amico: si vede zombie ' + !!cq.g.me.z + ' alle ' + (window.__JT % 100000))()`, 0],
  [1, `(() => { clearInterval(window.__JI); cqNetLeave(); return 'amico uscito; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 300],
  [0, `(() => { clearInterval(window.__CI); cqNetLeave(); return 'party chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
