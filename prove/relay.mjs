const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; store.settings.sound = true; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  cqV.relay = true;
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto (solo ponte)';
})()`;
const flow = who => `(async () => { const P = Object.values(cqV.peers)[0]; if (!P) return '${who}: nessun collegamento'; const rx = async () => { let b = 0; (await P.pc.getStats()).forEach(r => { if (r.type === 'inbound-rtp' && r.kind === 'audio') b = r.bytesReceived; }); return b; }; const a = await rx(); await new Promise(r => setTimeout(r, 2000)); const b = await rx(); await cqVoiceDiag(); return '${who}: ' + P.pc.connectionState + ', voce in arrivo ' + (b - a) + ' byte in 2 s | ' + $('#vDiag') ? '' : '' + cqVoiceDiagTxt(cqV.diag).replace(/<[^>]+>/g, ' ').slice(0, 160); })()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'host: set aperto'; })()`, 500],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 1500)); return 'amico dentro'; })()`, 500],
  [0, `cqVoiceMic().then(() => 'host: microfono acceso')`, 0], [1, `cqVoiceMic().then(() => 'amico: microfono acceso')`, 12000],
  [0, flow('host'), 0], [1, flow('amico'), 0],
  [0, `(() => cqVoiceDiagTxt(cqV.diag).replace(/<[^>]+>/g, ' '))()`, 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito'; })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 500],
];
