const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; store.settings.sound = true; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
// voce che arriva davvero: byte ricevuti in 2 s
const flow = who => `(async () => { const P = Object.values(cqV.peers)[0]; if (!P) return '${who}: nessun collegamento'; const rx = async () => { let b = 0; (await P.pc.getStats()).forEach(r => { if (r.type === 'inbound-rtp' && r.kind === 'audio') b = r.bytesReceived; }); return b; }; const a = await rx(); await new Promise(r => setTimeout(r, 2000)); const b = await rx(); return '${who}: ' + P.pc.connectionState + ', voce in arrivo ' + (b - a) + ' byte in 2 s, chi propone ' + (cq.net.sid < P.sid ? 'io' : 'l altro'); })()`;
// rompe il collegamento solo da una parte (come un telefono che ha perso la rete)
const brk = who => `(() => { for (const P of Object.values(cqV.peers)) { P.pc.close(); delete cqV.peers[P.sid]; } return '${who}: collegamento rotto da questa parte'; })()`;
// la pagina che NON propone (sid piu' grande) e' quella da rompere nel caso difficile
const role = `(() => { const N = cq.net, o = Object.keys(N.pl).find(s => s !== N.sid); return N.sid < o ? 'propone' : 'non propone'; })()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'host: set aperto'; })()`, 500],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 1500)); return 'amico dentro'; })()`, 500],
  [0, `cqVoiceMic().then(() => 'host: microfono acceso')`, 0], [1, `cqVoiceMic().then(() => 'amico: microfono acceso')`, 6000],
  [0, role, 0], [0, flow('host'), 0], [1, flow('amico'), 0],
  // 1. si rompe dalla parte dell'amico
  [1, brk('amico'), 22000], [0, flow('host dopo 22 s'), 0], [1, flow('amico dopo 22 s'), 0],
  // 2. si rompe dalla parte dell'host
  [0, brk('host'), 22000], [0, flow('host dopo 22 s'), 0], [1, flow('amico dopo 22 s'), 0],
  // 3. cambio di rete sull'amico (Wi-Fi staccato e riattaccato)
  [1, `(() => { window.dispatchEvent(new Event('online')); return 'amico: rete cambiata'; })()`, 8000], [0, flow('host'), 0], [1, flow('amico'), 0],
  [1, `(() => 'amico errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'))()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito'; })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
