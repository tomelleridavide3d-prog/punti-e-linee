// rete piu' stabile (23-10-2026), Colpo all'hotel online: host + amico (node prove/cdp2.mjs . prove/retenet.mjs)
// 1) fluidita': entrambi camminano avanti e indietro; ognuno misura come si muove l'altro sul suo schermo (fotogrammi fermi = scatti)
// 2) anti-lag: il telefono dell'amico smette di mandare la posizione per 2 s con una guardia addosso: non deve essere preso
// 3) arresto: tornata la rete la guardia lo prende; quanto ci mette l'amico a vedersi in cella
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.eco = false; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
// cammina avanti e indietro (come col dito): 3,4 caselle al secondo, cambia verso ogni 1,2 s o contro un muro
const walk = who => `(() => { clearInterval(window.__W); let d = 1, t = 0; window.__W = setInterval(() => { if (window.__STOP) { cq.walk = 0; return; } t += 0.02; if (t > 1.2) { t = 0; d = -d; } const nx = cq.x + d * 3.4 * 0.02; if (cqFree(nx, cq.y)) { cq.x = nx; cq.walk = (cq.walk || 0) + 0.2; } else { d = -d; } }, 20); return '${who} cammina da ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1); })()`;
// misura per 3 s come si muove l'altro sul mio schermo: fotogrammi in cui sta fermo pur camminando, passo piu' lungo
const watch = (who, other) => `(async () => { const c = cq.g.chars.find(o => o.name === '${other}'); let n = 0, still = 0, big = 0, px = c.x, py = c.y;
  await new Promise(res => { const t0 = performance.now(); const f = () => { const s = Math.hypot(c.x - px, c.y - py); px = c.x; py = c.y; n++; if (s < 0.002) still++; big = Math.max(big, s); if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  return '${who} vede ' + c.name + ': fotogrammi ' + n + ', fermo in ' + Math.round(still / n * 100) + '% (escluse le inversioni), passo piu lungo ' + big.toFixed(3) + ' caselle'; })()`;
const steps = [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'colpo' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { colpo: { time: 600, dif: 'n', map: 'grandhotel', n: 3, fill: true } }); cqNetList(); return 'host: party aperto, gioco colpo'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel party'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 3000)); const G = cq.g; G.pre = 0;
    G.gd.forEach((g, i) => { g.x = 30.5 + i * 2; g.y = 16.5; g.st = 'ko'; g.ko = 1e9; g.found = 1; g.path = []; });
    for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; c.x = 64.5; c.y = 30.5; } return 'host: partita ' + G.mode + ', guardie ferme'; })()`, 2500],
  [1, `(() => { cqCloseTask(); return 'amico: partita ' + cq.g.mode; })()`, 0], [0, `(() => { cqCloseTask(); return 'host pronto'; })()`, 0],
  [0, walk('host'), 0], [1, walk('amico'), 1000],
  [0, watch('host', 'zzAmico'), 0], [1, watch('amico', 'zzHost'), 0],
  // l'amico si ferma; poi il suo telefono smette di mandare la posizione (rete inceppata)
  [1, `(async () => { window.__STOP = 1; await new Promise(r => setTimeout(r, 600)); const p0 = window.cqNetPut; window.__P0 = p0; window.cqNetPut = (p, v) => { if (!/\\/pos\\//.test(p)) p0(p, v); }; window.__JT = 0; clearInterval(window.__JI); window.__JI = setInterval(() => { if (!window.__JT && cq.g && cq.g.me.jail) window.__JT = Date.now(); }, 10); return 'amico fermo in ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ': rete inceppata'; })()`, 0],
  [0, `(async () => { window.__STOP = 1; await new Promise(r => setTimeout(r, 1200)); const G = cq.g, c = G.chars.find(o => o.remote), g = G.gd[0];
    const lag = cqLagging(c); Object.assign(g, { x: c.x + 0.2, y: c.y, st: 'chase', tgt: c.id, ko: 0, path: [], sus: 1, lx: c.x, ly: c.y, lose: 0 });
    window.__CT = 0; clearInterval(window.__CI); window.__CI = setInterval(() => { if (!window.__CT && c.jail) window.__CT = Date.now(); }, 10);
    await new Promise(r => setTimeout(r, 600));
    return 'host: amico in ritardo ' + lag + ', guardia addosso (distanza ' + Math.hypot(g.x - c.x, g.y - c.y).toFixed(2) + '), dopo 0,6 s preso: ' + !!c.jail; })()`, 0],
  // torna la rete
  [1, `(() => { window.cqNetPut = window.__P0; return 'amico: rete tornata'; })()`, 2500],
  [0, `(() => { const G = cq.g, c = G.chars.find(o => o.remote); return 'host: in ritardo ' + cqLagging(c) + ', in cella ' + !!c.jail + ' (preso alle ' + (window.__CT % 100000) + ')'; })()`, 0],
  [1, `(() => 'amico: si vede in cella ' + !!cq.g.me.jail + ' alle ' + (window.__JT % 100000) + ', posizione ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1))()`, 0],
  [0, `(() => { const ct = window.__CT; return 'ritardo tra la presa (host) e la cella vista dall amico: vedi le due ore qui sopra; host conta ' + cqQ.n + ' intoppi (il buco voluto di 2 s)'; })()`, 0],
  [1, `(() => { clearInterval(window.__W); clearInterval(window.__JI); cqNetLeave(); return 'amico uscito; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 300],
  [0, `(() => { clearInterval(window.__W); clearInterval(window.__CI); cqNetLeave(); return 'party chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
// PRIMA=1: solo la misura della fluidita' (per provarla anche sulla versione di prima delle modifiche)
export default process.env.PRIMA ? steps.slice(0, 11).concat(steps.slice(-2)) : steps;
