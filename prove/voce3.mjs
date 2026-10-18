// voce a 3: tutti sentono tutti; microfono che muore da solo; voce che non parte verso un amico (si ripara da sola)
export const n = 3;
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = true; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const join = `(async () => { await new Promise(r => setTimeout(r, 1500)); const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 1500)); return 'dentro ' + code; })()`;
const flow = `(async () => { const get = async () => { const o = {}; for (const P of Object.values(cqV.peers)) { let b = 0; (await P.pc.getStats()).forEach(r => { if (r.type === 'inbound-rtp' && r.kind === 'audio') b = r.bytesReceived; }); o[cq.net.pl[P.sid].name] = b; } return o; }; const a = await get(); await new Promise(r => setTimeout(r, 2000)); const b = await get(); return 'sento: ' + Object.keys(b).map(k => k + ' ' + (b[k] - (a[k] || 0)) + 'B').join(', ') + ' | pallino ' + $('#cqHear').dataset.n; })()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzA'), 0], [2, name('zzB'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'set aperto'; })()`, 0],
  [1, join, 0], [2, join, 0],
  [0, `cqVoiceMic().then(() => 'mic')`, 0], [1, `cqVoiceMic().then(() => 'mic')`, 0], [2, `cqVoiceMic().then(() => 'mic')`, 12000],
  [0, flow, 0], [1, flow, 0], [2, flow, 0],
  [0, `(() => { cqV.mic.getAudioTracks()[0].stop(); return 'host: il microfono muore da solo'; })()`, 3000],
  [0, `(() => 'host: microfono ' + cqV.mic.getAudioTracks()[0].readyState)()`, 0],
  [1, flow, 0], [2, flow, 0],
  [0, `(() => { for (const P of Object.values(cqV.peers)) P.tr.sender.replaceTrack(null); return 'host: la voce smette di partire verso tutti'; })()`, 3000],
  [1, flow, 0],
  [0, `new Promise(r => setTimeout(r, 14000)).then(() => 'attesa riparazione')`, 0],
  [1, flow, 0], [2, flow, 0],
  [2, `(() => { cqNetLeave(); return 'uscito'; })()`, 300], [1, `(() => { cqNetLeave(); return 'uscito'; })()`, 300],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
