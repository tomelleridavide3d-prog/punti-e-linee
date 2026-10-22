// La casa delle trappole online: host + amico (node prove/cdp2.mjs . prove/trnet.mjs). Firebase vero: nomi zz da cancellare a fine prova.
// Manche 1: preparazione di tutti e due, l'amico ruba nella villa dell'host (l'host guarda e fa cadere il lampadario), poi il contrario.
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const st = who => `(() => { const G = cq.g; if (!G || !G.mode) return '${who}: niente partita'; return '${who}: fase ' + (G.st ? G.st.n + ':' + G.st.step : '-') + ' / ' + G.ph + ' | ladro ' + (G.thiefC ? G.thiefC.name : '-') + ' ' + (G.thief || '') + ' | cuori ' + G.hp + ' | barra: ' + $('#cqModeBar').textContent.slice(0, 90) + ' | scritta: ' + $('#cqCount').textContent.replace(/\\n/g, ' / ').slice(0, 120); })()`;
const goSpot = (n) => `(() => { const G = cq.g, T = window.__tr, S = T.spots(), i = S.findIndex(s => s.n === '${n}'), s = S[i]; for (const [a, b] of [[0.5, 1.32], [1.32, 0.5], [-0.32, 0.5], [0.5, -0.32], [0.5, 1.6], [1.6, 0.5]]) { cq.x = s.x + a; cq.y = s.y + b; const q = cqFree(cq.x, cq.y) && G.M.spotNear(G); if (q && q.i === i) break; } const b = G.M.btn(G); G.M.act(G); return 'vicino a ' + s.n + ': pulsante ' + (b && b.t); })()`;
export default [
  [0, name('zzTrHost'), 0], [1, name('zzTrAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'trappole' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { trappole: { map: 'villa', n: 2, fill: false, nt: 0 } }); cqNetList(); return 'host: set aperto'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzTrHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'amico nel set ' + code; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 4500)); const G = cq.g; return 'host: personaggi ' + G.chars.map(c => c.name + (c.bot ? '(pc)' : '')).join(' ') + ' | avversario ' + G.opp.name; })()`, 0],
  [0, st('host'), 0], [1, st('amico'), 0],
  // preparazioni: host diamante nella credenza del salone, telecamera e lampadario nel salone; amico diamante nel frigo, telecamera e lampadario in ingresso
  [0, `(() => { const T = window.__tr, G = cq.g; for (const [k, x, y] of [['dia', 14, 10], ['cam', 16, 14], ['jl', 16, 12], ['rastrello', 20, 22]]) { const e = T.place(G.mine, k, x, y); if (e) return 'NON MESSA ' + k + ': ' + e; } T.buildDone(G); return 'host: villa pronta, fase ' + G.ph; })()`, 300],
  [1, `(() => { const T = window.__tr, G = cq.g; for (const [k, x, y] of [['dia', 30, 21], ['cam', 16, 24], ['jl', 16, 23], ['buccia', 13, 23]]) { const e = T.place(G.mine, k, x, y); if (e) return 'NON MESSA ' + k + ': ' + e; } T.buildDone(G); return 'amico: villa pronta, fase ' + G.ph + ' | scritta ' + $('#cqCount').textContent; })()`, 2500],
  [0, st('host'), 0], [1, st('amico'), 0],
  // l'amico ruba: passa sul rastrello dell'host
  [1, `(() => { cq.x = 20.5; cq.y = 22.5; return 'amico sul rastrello'; })()`, 1600],
  [1, `(() => 'amico: cuori ' + cq.g.hp + ' | ' + __T.slice(-1)[0])()`, 0],
  [0, `(() => 'host vede: cuori del ladro ' + cq.g.hp + ' | trappole scattate ' + cq.g.fx.map(f => f.k).join(',') + ' | ' + __T.slice(-1)[0])()`, 0],
  // l'amico entra nel salone, sotto il lampadario; l'host lo vede dalla telecamera e lo fa cadere
  [1, `(() => { cq.g.stun = 0; cq.x = 16.5; cq.y = 12.6; return 'amico sotto il lampadario'; })()`, 1500],
  [0, `(() => { const G = cq.g; const b = G.M.btn(G), vis = G.M.hide(G.thiefC) === false; if (b) G.M.act(G); return 'host: ladro visibile ' + vis + ' | pulsante ' + (b && b.t) + ' | jolly usati ' + [...G.jused].join(','); })()`, 1800],
  [1, `(() => 'amico: cuori ' + cq.g.hp + ' | ' + (cq.g.stunT || '') + ' | jolly arrivati ' + cq.g.jfx.map(f => f.k).join(','))()`, 0],
  [0, `(() => 'host vede: cuori del ladro ' + cq.g.hp)()`, 0],
  // l'amico prende il diamante e torna al portone
  [1, `(async () => { const G = cq.g; G.stun = 0; await new Promise(r => setTimeout(r, 300)); return 'amico: ' + ${JSON.stringify(goSpot('Credenza'))}.length; })()`, 0],
  [1, goSpot('Credenza'), 2600],
  [1, `(() => 'amico: diamante ' + cq.g.has + ' | ' + __T.slice(-1)[0])()`, 0],
  [0, `(() => 'host vede: ha il diamante ' + cq.g.has + ' | ' + __T.slice(-1)[0])()`, 0],
  [1, `(() => { cq.x = 16.8; cq.y = 28.6; return 'amico al portone'; })()`, 2000],
  [0, st('host'), 0], [1, st('amico'), 0],
  [0, `(async () => { await new Promise(r => setTimeout(r, 3500)); return 'dopo il cambio'; })()`, 0],
  [0, st('host'), 0], [1, st('amico'), 0],
  // ora ruba l'host nella villa dell'amico: l'amico lo guarda dall'ingresso e fa cadere il lampadario
  [0, `(() => { cq.x = 16.5; cq.y = 23.4; return 'host sotto il lampadario dell amico'; })()`, 1500],
  [1, `(() => { const G = cq.g; const b = G.M.btn(G), vis = G.M.hide(G.thiefC) === false; if (b) G.M.act(G); return 'amico: ladro visibile ' + vis + ' | pulsante ' + (b && b.t); })()`, 1800],
  [0, `(() => 'host: cuori ' + cq.g.hp + ' | ' + (cq.g.stunT || '') + ' | jolly ' + cq.g.jfx.map(f => f.k).join(','))()`, 0],
  [1, `(() => 'amico vede: cuori del ladro ' + cq.g.hp)()`, 0],
  [0, `(async () => { cq.g.stun = 0; await new Promise(r => setTimeout(r, 200)); return 'ok'; })()`, 0],
  [0, goSpot('Frigo'), 2600],
  [0, `(() => { cq.x = 16.8; cq.y = 28.6; return 'host al portone, diamante ' + cq.g.has; })()`, 2500],
  [0, st('host'), 0], [1, st('amico'), 0],
  [0, `(async () => { await new Promise(r => setTimeout(r, 6000)); return 'dopo il risultato'; })()`, 0],
  [0, st('host'), 0], [1, st('amico'), 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
