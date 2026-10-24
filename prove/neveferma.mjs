// bug 24-10-2026: il bambino fermo visto dall altro telefono impazziva (neve usava c.vx/c.vy, gli stessi di cqNetGlide). uso: node prove/cdp2.mjs . prove/neveferma.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.eco = false; store.settings.sound = false; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  try { localStorage.setItem('neveHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const wait = ms => `await new Promise(r => setTimeout(r, ${ms}));`;
// registra per ms la posizione dell'altro: ampiezza, inversioni di direzione, e la mia
const rec = (who, ms) => `(async () => { const G = cq.g, o = G.chars.find(c => c !== G.me && !c.bot || c.remote) || G.chars.find(c => c !== G.me); const xs = [], ys = [], fs = [], ws = []; const t0 = performance.now();
  await new Promise(r => { const f = () => { xs.push(o.x); ys.push(o.y); fs.push(o.face); ws.push(o.walk); if (performance.now() - t0 < ${ms}) requestAnimationFrame(f); else r(); }; f(); });
  let rev = 0, last = 0; for (let i = 1; i < xs.length; i++) { const d = xs[i] - xs[i - 1]; if (Math.abs(d) > 0.002) { const s = Math.sign(d); if (last && s !== last) rev++; last = s; } }
  let fl = 0; for (let i = 1; i < fs.length; i++) if (fs[i] !== fs[i - 1]) fl++;
  const r2 = v => Math.round(v * 100) / 100;
  return '${who} vede altro: fotogrammi ' + xs.length + ', x da ' + r2(Math.min(...xs)) + ' a ' + r2(Math.max(...xs)) + ', y da ' + r2(Math.min(...ys)) + ' a ' + r2(Math.max(...ys)) + ', inversioni ' + rev + ', giri faccia ' + fl + ', walk ' + r2(ws[0]) + '->' + r2(ws[ws.length-1]) + ', vel ' + r2(o.vx || 0) + ',' + r2(o.vy || 0) + ' | io sono a ' + r2(cq.x) + ',' + r2(cq.y) + ' fase ' + G.st.ph; })()`;
export default [
  [0, name('zzNfHost'), 0], [1, name('zzNfAmico'), 800],
  [0, `(async () => { $('#netNew').click(); ${wait(2500)} store.settings.cqOpt = Object.assign(cqOpt(), { game: 'neve' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { neve: { map: 'neve', n: 2, fill: true } }); cqNetList(); return 'host: set aperto'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzNfHost'); cqNetJoin(code); ${wait(2000)} return 'amico nel set'; })()`, 500],
  [0, `(async () => { cqNewMatch(); ${wait(4500)} cqCloseTask(); return 'host: partita ' + cq.g.mode; })()`, 0],
  [1, `(() => { cqCloseTask(); return 'amico: partita ' + (cq.g && cq.g.mode); })()`, 0],
  [1, rec('amico (costruzione)', 2500), 0], [0, rec('host (costruzione)', 2500), 0],
  [1, `(async () => { window.__neve.myReady(cq.g); ${wait(600)} return 'amico pronto'; })()`, 0],
  [0, `(async () => { window.__neve.myReady(cq.g); ${wait(4500)} return 'host: fase ' + cq.g.st.ph; })()`, 0],
  [1, rec('amico (battaglia, fermi)', 3000), 0], [0, rec('host (battaglia, fermi)', 3000), 0],
  // l'amico cammina con il tasto e si ferma
  [1, `(async () => { const k = (t, c) => window.dispatchEvent(new KeyboardEvent(t, { key: c, code: c, bubbles: true })); k('keydown', 'ArrowLeft'); ${wait(1200)} k('keyup', 'ArrowLeft'); return 'amico camminato a ' + cq.x.toFixed(2) + ' walk ' + cq.walk; })()`, 300],
  [0, `(async () => { const G = cq.g, o = G.chars.find(c => c.remote), N = cq.net, out = []; const t0 = performance.now(); let i = 0;
    await new Promise(r => { const f = () => { if (i++ % 6 === 0) { const p = N.pos[o.sid]; out.push([Math.round(performance.now() - t0), o.x.toFixed(2), o.y.toFixed(2), 'tx', o.tx, o.ty, 'v', (o.vx||0).toFixed(2), (o.vy||0).toFixed(2), 'pos', p && p.x, p && p.y, p && p.t, 'path', (o.path||[]).length].join(' ')); } if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(); }; f(); });
    return out.join(' || '); })()`, 0],

  [0, `(async () => { const k = (t, c) => window.dispatchEvent(new KeyboardEvent(t, { key: c, code: c, bubbles: true })); k('keydown', 'ArrowRight'); ${wait(1200)} k('keyup', 'ArrowRight'); return 'host camminato a ' + cq.x.toFixed(2); })()`, 300],
  [1, rec('amico (host appena fermo)', 3000), 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 300],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
