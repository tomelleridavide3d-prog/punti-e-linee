// Assedio online, passo C2: faretra, porticina e sortita (ariete incendiato e spento), torre d'assedio spinta all'attracco e salita (node prove/cdp2.mjs . prove/asnet4.mjs)

const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  try { localStorage.setItem('asHelpN', '9'); localStorage.setItem('asCls', 'a'); } catch {}
  store.settings.myName = '${n}'; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; const a = G.chars.find(c => c.name === 'zzAsAmico'), T = G.ct;
  return '${who}: catapulta ' + (T ? T.x.toFixed(1) + ',' + T.y.toFixed(1) + ' vita ' + T.hp + ' sassi ' + T.n + ' guida ' + T.drv + (T.dn ? ' DISTRUTTA' : '') : '-') + ' | sassi in volo ' + (G.rk || []).length + ' | muro ' + (G.wl || []).join('') + ' | amico ' + (a === G.me ? cq.x : a.x).toFixed(1) + ',' + (a === G.me ? cq.y : a.y).toFixed(1) + (a.stn ? ' col SASSO' : '') + ' | balestre ' + (G.bl || []).map(b => b.hp + (b.rl > G.time ? ' carica' : '')).join(' / '); })()`;
const btn = `(() => { const t = $('#cqKill').hidden ? '(nessun pulsante)' : $('#cqKill').textContent; cqMyKill(); return 'amico preme: ' + t; })()`;
const walk = (dy, n) => `(async () => { for (let i = 0; i < ${n}; i++) { if (cqFreeZ(cq.x, cq.y, cq.x, cq.y + ${dy})) cq.y += ${dy}; await new Promise(r => setTimeout(r, 60)); } return 'amico cammina, ora ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1); })()`;
const st2 = who => `(() => { const G = cq.g, a = G.chars.find(c => c.name === 'zzAsAmico'), h = G.chars.find(c => c.name === 'zzAsHost'), T = G.tw;
  return '${who}: amico frecce ' + a.q + ' | ariete ' + (G.rm.fire > G.time ? 'IN FIAMME' : 'ok') + ' y ' + G.rm.y.toFixed(1) + ' | host ' + (h === G.me ? cq.x : h.x).toFixed(1) + ',' + (h === G.me ? cq.y : h.y).toFixed(1) + ' zona ' + window.__as.zoneAt(h === G.me ? cq.x : h.x, h === G.me ? cq.y : h.y) + ' | torre ' + T.x.toFixed(1) + ',' + T.y.toFixed(1) + ' attracco ' + T.dk + ' | amico ' + (a === G.me ? cq.x : a.x).toFixed(1) + ',' + (a === G.me ? cq.y : a.y).toFixed(1) + ' zona ' + window.__as.zoneAt(a === G.me ? cq.x : a.x, a === G.me ? cq.y : a.y); })()`;
const hbtn = `(() => { const t = $('#cqKill').hidden ? '(nessun pulsante)' : $('#cqKill').textContent; cqMyKill(); return 'host preme: ' + t; })()`;
export default [
  [0, name('zzAsHost'), 0], [1, name('zzAsAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'assedio' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { assedio: { time: 240, lit: 'd', map: 'castello', n: 4, fill: true } }); cqNetList(); return 'host: set aperto'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzAsHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 2500)); const G = cq.g; G.pre = 0; const a = G.chars.find(c => c.name === 'zzAsAmico'); G.me.t = 1 - a.t; G.a0 = a.t; for (const c of G.chars) if (c.bot) c.alive = false; window.__as.setupHalf(G); G.me.cls = 'n'; G.me.x = cq.x = 22.5; G.me.y = cq.y = 47.6; G.rm.y = 66; return 'host: partita, host genio vicino alla porticina, ariete sulla strada'; })()`, 3000],
  [1, st2('amico'), 0],
  // faretra: l'amico tira 6 frecce lontano da tutti, resta senza, poi passa vicino alla cesta
  [1, `(async () => { const G = cq.g; cq.x = 23.5; cq.y = 70.5; for (let i = 0; i < 7; i++) { G.me.rl = 0; window.__as.fire(G, 23.5, 62.5); await new Promise(r => setTimeout(r, 1000)); } return 'amico ha tirato 7 volte; pulsante ' + $('#asBow').textContent; })()`, 1000],
  [1, st2('amico'), 0], [1, `(() => { cq.x = 23.5; cq.y = 67.4; return 'amico alla cesta'; })()`, 1500], [1, st2('amico'), 0],
  // sortita: l'host esce dalla porticina e incendia l'ariete
  [0, hbtn, 1500], [0, st2('host'), 0],
  [0, `(() => { cq.x = 31.5; cq.y = 66.5; return 'host accanto all ariete'; })()`, 1000], [0, hbtn, 3200], [0, st2('host'), 0],
  // l'amico lo spegne
  [1, `(() => { cq.x = 27.4; cq.y = 66.5; return 'amico accanto all ariete'; })()`, 1000], [1, btn, 2800], [1, st2('amico'), 0],
  // torre: l'amico la porta all'attracco e ci sale
  [0, `(() => { const G = cq.g; G.tw.x = 12.5; G.tw.y = 57.2; return 'host: torre messa vicino all attracco (per la prova)'; })()`, 800],
  [1, `(() => { cq.x = 12.5; cq.y = 59.0; return 'amico dietro la torre'; })()`, 1200], [1, btn, 800], [1, walk(-0.17, 16), 1500], [1, st2('amico'), 0],
  [1, `(() => { const G = cq.g; cq.x = G.tw.x; cq.y = G.tw.y + 1.45; return 'amico al retro della torre'; })()`, 1000], [1, btn, 2200], [1, st2('amico'), 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
