// Maestro e Apprendista (node prove/cdp2.mjs . prove/alc24.mjs): host esperto (5 partite) + amico nuovo (0):
// la partita si gioca al livello dell'apprendista, a fine partita l'amico sale di 2 e l'host vince la nappina d'oro
const name = (n, lv) => `(async () => {
  store.settings.myName = '${n}'; store.settings.eco = false; store.settings.alcGames = ${lv}; store.settings.alcSeenLv = ${lv}; store.settings.alcMentor = 0; store.settings.alcTut = 1; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto, partite ' + store.settings.alcGames;
})()`;
const look = who => `(() => { const G = cq.g, A = window.__alc, jx = document.querySelector('#alJars [data-i="x"]'), js = document.querySelector('#alJars [data-i="s"]');
  return '${who}: ml ' + G.st.ml + ' mx ' + G.st.mx + ' | PL ' + A.PL() + ' maxI ' + A.maxI() + ' maestro ' + A.mentor(G) + ' | fenice "' + (jx && jx.textContent) + '" | sabbia "' + (js && js.textContent) + '" | riga "' + ($('#alCol') ? $('#alCol').textContent : '-') + '"'; })()`;
export default [
  [0, name('zzMaHost', 5), 0], [1, name('zzMaAmico', 0), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'alchimisti' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { alchimisti: { map: 'torre', n: 2, fill: true } }); cqNetList(); return 'host: party aperto'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzMaHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel party'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 4000)); cqCloseTask(); return 'host: partita ' + cq.g.mode; })()`, 1500],
  [1, `(() => { cqCloseTask(); return 'amico: partita ' + (cq.g && cq.g.mode); })()`, 2500],
  [0, look('host'), 0], [1, look('amico'), 0],
  [0, `(() => { const J = id => document.querySelector('#alJars [data-i="' + id + '"]').click(); J('f'); J('i'); J('r'); return 'host: provo 3 ingredienti, nel calderone ' + window.__alc.U2.pot.join('') + ' | ' + $('#alMsg').textContent; })()`, 0],
  [0, `(() => { const J = id => document.querySelector('#alJars [data-i="' + id + '"]').click(); window.__alc.U2.pot = []; J('x'); return 'host: provo la fenice: ' + $('#alMsg').textContent; })()`, 0],
  // fine partita forzata dall'host
  [0, `(async () => { const G = cq.g; G.st = Object.assign({}, G.st, { ph: 'mres', fin: true, t0: G.time, msg: 'fine prova', win: G.me.id }); await new Promise(r => setTimeout(r, 2500)); return 'host: partite ' + store.settings.alcGames + ', maestro ' + store.settings.alcMentor + ', premi "' + window.__alc.myCos() + '"'; })()`, 1500],
  [1, `(() => 'amico: partite ' + store.settings.alcGames + ' (prima 0), premi host visti "' + (cq.g.chars.find(c => c !== cq.g.me).cos || '') + '"')()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 300],
  [0, `(() => { cqNetLeave(); store.settings.alcGames = 5; store.settings.alcMentor = 0; saveStore(); return 'party chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
