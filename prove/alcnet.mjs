// Duello degli alchimisti online, passo 1 (node prove/cdp2.mjs . prove/alcnet.mjs): host + amico nella torre,
// ognuno nel suo angolo, l'amico si muove e l'host lo vede, cuori e lati (cappello viola / verde) uguali sui due telefoni
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.eco = false; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const pos = who => `(() => { const G = cq.g; if (!G) return '${who}: nessuna partita'; const o = G.chars.find(c => c !== G.me);
  return '${who}: ' + G.mode + ' | io ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ' (lato ' + G.chars.indexOf(G.me) + ', cuori ' + G.me.hp + ') | altro ' + (o ? o.name + ' ' + o.x.toFixed(1) + ',' + o.y.toFixed(1) + ' cuori ' + o.hp : '-') + ' | ' + $('#cqModeBar').textContent; })()`;
export default [
  [0, name('zzAlHost'), 0], [1, name('zzAlAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'alchimisti' }); store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { alchimisti: { map: 'torre', n: 2, fill: true } }); cqNetList(); return 'host: party aperto, gioco alchimisti'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzAlHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel party'; })()`, 500],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 4000)); cqCloseTask(); const G = cq.g; return 'host: partita ' + G.mode + ', personaggi ' + G.chars.map(c => c.name + (c.remote ? ' (amico)' : c.bot ? ' (computer)' : '')).join(', '); })()`, 1500],
  [1, `(() => { cqCloseTask(); return 'amico: partita ' + (cq.g && cq.g.mode); })()`, 0],
  [0, pos('host'), 0], [1, pos('amico'), 0],
  [1, `(async () => { await new Promise(r => setTimeout(r, 3500)); const J = id => document.querySelector('#alJars [data-i="' + id + '"]').click(); J('i'); J('r'); $('#alBot').click(); J('v'); $('#alBot').click(); $('#alRdy').click(); return 'amico: pannello ' + !!document.getElementById('alPrep') + ', cintura ' + cq.g.me.belt.join(',') + ', pronto'; })()`, 1500],
  [0, `(() => { const G = cq.g, o = G.chars.find(c => c.remote); return 'host: fase ' + G.st.ph + ', pronti ' + JSON.stringify(G.st.rd) + ', cintura amico ' + (o.belt || []).join(','); })()`, 0],
  [0, `(async () => { const J = id => document.querySelector('#alJars [data-i="' + id + '"]').click(); J('f'); J('s'); $('#alBot').click(); $('#alRdy').click(); await new Promise(r => setTimeout(r, 1500)); return 'host: fase ' + cq.g.st.ph + ', pannello ' + !!document.getElementById('alPrep'); })()`, 1000],
  [1, `(() => { const G = cq.g, h = G.chars.find(c => c !== G.me); return 'amico: fase ' + G.st.ph + ', piano ' + cq.map + ', pannello ' + !!document.getElementById('alPrep') + ', cintura host vista ' + (h.belt || []).join(','); })()`, 0],
  // duello: l'amico lancia fuoco sull'host, l'host lancia vento vicino all'amico (spinta fatta dal telefono dell'amico)
  [0, `(() => { const G = cq.g; cq.x = 9.5; cq.y = 13.5; G.me.belt = ['f', 'v', 'ir', '']; return 'host: in posizione 9.5,13.5'; })()`, 800],
  [1, `(async () => { const G = cq.g; cq.x = 12.5; cq.y = 13.5; G.me.belt = ['f', '', '', '']; G.sel = 0; await new Promise(r => setTimeout(r, 600)); window.__alc.myThrow(G, 9.5, 13.5); return 'amico: lancio 🔥 sull\\'host, in volo ' + G.fl.length; })()`, 2200],
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.remote); const hp = G.me.hp; cq.x = 8.5; cq.y = 11.5; G.me.hp = 3; return 'host: miei cuori ' + hp + ' (poi esco dalla pozza), scoppi ' + G.bx.map(b => b[1]).join(',') + ', cintura amico ' + a.belt.join(','); })()`, 0],
  [1, `(() => { const G = cq.g, h = G.chars.find(c => c !== G.me); window.__P0 = [cq.x, cq.y]; return 'amico: cuori host visti ' + h.hp + ', pozze ' + G.zn.map(z => z.k).join(','); })()`, 0],
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.remote); G.me.thT = 0; G.me.fx = {}; G.sel = 1; window.__alc.myThrow(G, a.x - 0.4, a.y); return 'host: lancio 🦅 vento accanto all\\'amico (' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ')'; })()`, 2200],
  [1, `(() => { const G = cq.g; return 'amico: spinto da ' + window.__P0.map(v => v.toFixed(1)).join(',') + ' a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1) + ', cuori ' + G.me.hp + ', scritte viste ' + (G.spl || []).length; })()`, 0],
  // l'amico BEVE il fuoco (mantello di fiamme): l'host lo applica, l'amico lo vede su di se'
  [1, `(() => { const G = cq.g; G.me.belt = ['f', '', '', '']; G.sel = 0; G.me.thT = 0; window.__alc.myDrink(G); return 'amico: bevo 🔥'; })()`, 1500],
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.remote); return 'host: stati amico ' + Object.keys(a.fx || {}).filter(k => a.fx[k] > G.time && !k.includes('@')).join(',') + ', cintura amico ' + a.belt.map(k => k || '-').join(','); })()`, 0],
  [1, `(() => { const G = cq.g; return 'amico: miei stati ' + Object.keys(G.me.fx || {}).filter(k => G.me.fx[k] > G.time && !k.includes('@')).join(','); })()`, 0],
  // ampolle instabili alla cintura dell'amico: l'host lo colpisce col fuoco, il telefono dell'amico le toglie dalla sua cintura
  [1, `(() => { const G = cq.g; G.me.belt = ['ooo', 'ooo', 'ooo', 'f']; cqNetSend({ k: 'belt', b: G.me.belt.join(',') }); G.me.fx = {}; return 'amico: cintura instabile ' + G.me.belt.join(','); })()`, 1200],
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.remote); a.hp = 3; a.iv = 0; G.me.fx = {}; window.__alc.burst(G, 'f', a.x, a.y, G.me.id); return 'host: fuoco sull\\'amico, sua cintura qui ' + a.belt.map(k => k || '-').join(','); })()`, 2000],
  [1, `(() => { const G = cq.g; return 'amico: la mia cintura ' + G.me.belt.map(k => k || '-').join(',') + ', cuori ' + G.me.hp; })()`, 0],
  [1, `(async () => { for (let i = 0; i < 20; i++) { cq.x -= 0.1; cq.walk += 0.5; await new Promise(r => setTimeout(r, 60)); } return 'amico: cammino fino a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1); })()`, 1500],
  [0, pos('host'), 0],
  [1, `(() => { const G = cq.g, h = G.chars.find(c => c !== G.me), d = G.M.draw(h), dm = G.M.draw(G.me); return 'amico: cappello host lato ' + G.chars.indexOf(h) + ', mio lato ' + G.chars.indexOf(G.me) + ', disegni ' + (typeof d) + '/' + (typeof dm); })()`, 0],
  // si sale: l'amico perde la manche, dopo il risultato tutti e due nella sala dell'orologio
  [0, `(() => { const G = cq.g, a = G.chars.find(c => c.remote); a.iv = 0; a.hp = 1; a.fx = {}; const lag = cqLagging(a); window.__alc.burst(G, 'f', a.x, a.y, G.me.id); return 'host: fuoco finale (amico in ritardo: ' + lag + '), fase ' + G.st.ph + ', cuori amico ' + a.hp; })()`, 7000],
  [0, `(() => 'host: manche ' + cq.g.st.n + ' ' + cq.g.st.ph + ', piano ' + cq.map + ', piante ' + (cq.g.pl || []).length)()`, 0],
  [1, `(() => 'amico: manche ' + cq.g.st.n + ' ' + cq.g.st.ph + ', piano ' + cq.map + ', pannello ' + (document.getElementById('alFl') ? document.getElementById('alFl').textContent.slice(0, 40) : 'NO'))()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 300],
  [0, `(() => { cqNetLeave(); return 'party chiuso; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
