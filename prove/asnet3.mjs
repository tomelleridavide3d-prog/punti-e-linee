// Assedio online, passo C1: catapulta e balestra tra due telefoni (node prove/cdp2.mjs . prove/asnet3.mjs)
// l'amico (attacca) spinge la catapulta, tira un sasso sul muro, prende un sasso alla catasta e lo carica; l'host (difende) dalla balestra colpisce la catapulta
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
export default [
  [0, name('zzAsHost'), 0], [1, name('zzAsAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'assedio' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { assedio: { time: 240, lit: 'd', map: 'castello', n: 4, fill: true } }); cqNetList(); return 'host: set aperto'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzAsHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 2500)); const G = cq.g; G.pre = 0; const a = G.chars.find(c => c.name === 'zzAsAmico'); G.me.t = 1 - a.t; G.a0 = a.t; for (const c of G.chars) if (c.bot) c.alive = false; window.__as.setupHalf(G); G.ct.x = 40.5; G.ct.y = 69; G.me.x = cq.x = 55.5; G.me.y = cq.y = 49.3; return 'host: partita, amico attacca, host alla balestra di sud-est'; })()`, 3000],
  [1, st('amico'), 0],
  // l'amico va dietro la catapulta, la prende e la spinge in su di 3 caselle
  [1, `(() => { cq.x = 40.5; cq.y = 70.7; cq.wdx = 0; cq.wdy = -1; return 'amico dietro la catapulta'; })()`, 1200],
  [1, btn, 1000], [1, walk(-0.17, 22), 1200], [0, st('host'), 0],
  [1, btn, 1000],
  // tira un sasso sul tratto di muro davanti (col pulsante dell'arma che e' diventato la catapulta)
  [1, `(() => { const G = cq.g, AS = window.__as; cq.x = G.ct.x + 1.4; cq.y = G.ct.y + 0.6; return 'amico accanto: ' + JSON.stringify(AS.machOf(G, G.me) && AS.machOf(G, G.me).k); })()`, 1200],
  [1, `(() => { const G = cq.g, AS = window.__as, M = AS.machOf(G, G.me); if (!M) return 'amico: nessuna macchina'; AS.fireMach(G, { ok: true, x: 42.5, y: 51.3, m: 'c', i: -1, o: M.o }); return 'amico tira la catapulta; pulsante arma: ' + $('#asBow').textContent; })()`, 3500],
  [0, st('host'), 0], [1, `(() => 'amico: ' + __T.slice(-3).join(' / '))()`, 0],
  // va alla catasta, prende un sasso, lo riporta e lo carica
  [1, `(() => { cq.x = 44.5; cq.y = 78.6; return 'amico alla catasta'; })()`, 1200], [1, btn, 1200],
  [1, `(() => { const G = cq.g; cq.x = G.ct.x + 1.2; cq.y = G.ct.y + 0.8; return 'amico torna alla catapulta'; })()`, 1500], [1, btn, 1500], [1, st('amico'), 0],
  // l'host tira con la balestra alla catapulta (2 dardi)
  [0, `(async () => { const G = cq.g, AS = window.__as; let r = ''; for (let k = 0; k < 2; k++) { const M = AS.machOf(G, G.me); if (!M) return 'host: niente balestra ' + cq.x + ',' + cq.y; G.bl[M.i].rl = 0; AS.fireMach(G, { ok: true, x: G.ct.x, y: G.ct.y, m: 'b', i: M.i, o: M.o }); await new Promise(r => setTimeout(r, 1500)); r += ' vita ' + G.ct.hp; } return 'host tira con la balestra:' + r; })()`, 1500],
  [1, st('amico'), 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
