// Caccia al mammut online: host + amico con Firebase vero (node prove/cdp2.mjs . prove/mamnet.mjs)
// Controlla il giro 5 (caccia vera): foschia (il mammut si vede solo da vicino anche per l'amico), lancia dell'amico che lo ferisce,
// mammut circondato (le lance dell'amico fanno 2), fame che arriva all'amico, notte con gli sciacalli, cronaca.
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; const m = G.mm, a = G.chars.find(c => c.name === 'zzAmico'); return '${who}: mammut ' + m.st + ' vita ' + m.hp + '/' + m.max + ' a ' + Math.hypot(m.x - cq.x, m.y - cq.y).toFixed(1) + ' caselle, disegnato ' + G.M.extras(G).some(e => e.mam) + ' | amico lance ' + a.sp + ' fame ' + (a.hun || 0) + ' | ' + $('#cqModeBar').textContent; })()`;
const near = d => `(() => { const G = cq.g, m = G.mm; for (let t = 0; t < 300; t++) { const a = t * 0.41, x = m.x + Math.cos(a) * ${d}, y = m.y + Math.sin(a) * ${d}; if (cqCellFree(Math.floor(x), Math.floor(y))) { cq.x = x; cq.y = y; break; } } return 'amico a ' + Math.hypot(m.x - cq.x, m.y - cq.y).toFixed(1) + ' caselle dal mammut'; })()`;
const throwIt = `(() => { const b = document.getElementById('mmThrow'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'amico: lancia (pulsante acceso ' + b.classList.contains('on') + ')'; })()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'mammut' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { mammut: { nights: 2, map: 'prateria', n: 4, fill: true } }); cqNetList(); return 'host: set aperto, gioco mammut'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set: ' + $('#hlInfo').textContent.slice(0, 60); })()`, 500],
  // partita: computer fermi, mammut che pascola, di giorno
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 4000)); const G = cq.g; G.pre = 0; G.time = 20; for (const c of G.chars) if (c.bot) { c.think = 1e9; c.path = []; } const m = G.mm; m.st = 'graze'; m.gT = 1e9; m.path = []; m.aw = 0; window.__hold = setInterval(() => { if (m.st === 'graze' || m.st === 'walk' || m.st === 'cur') { m.st = 'graze'; m.gT = 1e9; m.path = []; m.aw = 0; } }, 50); return 'host: partita, ' + G.chars.length + ' personaggi'; })()`, 3500],
  [1, `(() => 'amico: ' + (cq.g && cq.g.mode) + ' | ' + $('#cqModeBar').textContent)()`, 0],
  [1, near(12), 1500], [1, st('amico lontano (12)'), 0],
  [1, near(4), 1500], [1, st('amico vicino (4)'), 0],
  [1, throwIt, 1800],
  [0, st('host dopo la lancia'), 0], [1, `(() => 'amico cronaca: ' + __T.slice(-2).join(' / '))()`, 0],
  // circondato: l'host lo blocca, l'amico tira
  [0, `(() => { const G = cq.g, m = G.mm; clearInterval(window.__hold); const a = G.chars.find(c => c.name === 'zzAmico'); a.dn = 0; a.alive = true; a.sp = 2; m.x = a.x + 3; m.y = a.y; m.st = 'stuck'; m.stT = G.time + 7; m.path = []; return 'host: mammut bloccato, vita ' + m.hp; })()`, 1200],
  [1, `(() => { const G = cq.g; G.me.thT = 0; return 'amico vede: ' + G.mm.st + ' | ' + G.M.big(G); })()`, 0],
  [1, throwIt, 1500],
  [0, `(() => { const G = cq.g; return 'host: vita ' + G.mm.hp + ' (deve essere scesa di 2) | ' + __T.slice(-1)[0]; })()`, 0],
  // fame e notte
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAmico'); a.hun = 2; G.food = 0; G.mm.st = 'graze'; G.mm.gT = 1e9; G.time = 117; return 'host: amico sfinito dalla fame, quasi notte'; })()`, 4500],
  [1, `(() => { const G = cq.g; cq.x = G.mm.x + 30; cq.y = G.mm.y; return 'amico: fame ' + G.me.hun + ' velocita ' + G.M.speed(G.me).toFixed(2) + ' | sciacalli ' + G.jk.length + ' | ' + $('#cqModeBar').textContent + ' | ' + __T.slice(-2).join(' / '); })()`, 1500],
  [1, `(() => { const G = cq.g; return 'amico al buio: ' + G.M.big(G) + ' | mammut disegnato ' + G.M.extras(G).some(e => e.mam); })()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
