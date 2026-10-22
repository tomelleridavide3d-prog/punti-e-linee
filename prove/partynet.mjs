// party (2 pagine, Firebase vero): solo su invito, amici, invito che arriva, Entra, chat della hall con i fumetti, butta fuori (e non si rientra)
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; store.settings.friends = []; store.settings.partyPriv = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 600)); openCiack(); $('#pkGo').click(); await new Promise(r => setTimeout(r, 1500));
  return 'reception: ' + ($('#netNew') ? $('#netNew').textContent : 'MANCA') + ' | ' + document.querySelector('details.gList summary').textContent;
})()`;
const sets = `Object.entries(cq.sets || {}).filter(([k, v]) => v.h === 'zzHost').map(([k, v]) => k + (v.p ? ' (privato)' : ''))`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netPriv').checked = true; $('#netPriv').onchange({ target: $('#netPriv') }); $('#netNew').click(); await new Promise(r => setTimeout(r, 3000)); return 'host: party aperto, privato ' + cq.net.priv + ' | ' + __T.slice(-1)[0]; })()`, 2500],
  [1, `(() => { cqNetBox(); return 'amico vede nella lista: ' + (document.querySelectorAll('#lbNet [data-join]').length) + ' party (in memoria: ' + ${sets}.join(',') + ')'; })()`, 0],
  [0, `(async () => { cqPartyOpen(); await new Promise(r => setTimeout(r, 300)); $('#ptAddI').value = 'zzAmico'; $('#ptAddF').onsubmit({ preventDefault() {} }); await new Promise(r => setTimeout(r, 300)); const b = document.querySelector('#ptBody [data-inv]'); const t = b ? b.textContent : 'nessun pulsante'; if (b) b.click(); await new Promise(r => setTimeout(r, 400)); return 'host: amici ' + frList().map(x => x.n) + ', pulsante "' + t + '" -> ' + __T.slice(-1)[0]; })()`, 2500],
  [1, `(async () => { cqNetBox(); const b = document.querySelector('#lbNet .invBox'); const r = 'amico: ' + __T.slice(-1)[0] + ' | riquadro invito: ' + (b ? b.textContent : 'MANCA'); if (b) b.querySelector('[data-join]').click(); await new Promise(r => setTimeout(r, 3000)); return r + ' | dentro il party: ' + !!(cq.net && cq.g && cq.g.hall); })()`, 1500],
  [0, `(async () => { const t = $('#ptBody').textContent; cqCloseTask(); cqChatSend('Ciao a tutti!'); await new Promise(r => setTimeout(r, 1500)); return 'host: nel pannello ' + (t.includes('zzAmico') ? 'zzAmico c\\'e\\'' : 'zzAmico MANCA') + ' | pulsanti: party ' + !$('#cqPartyB').hidden + ' "' + $('#cqPartyB').textContent + '", chat ' + !$('#cqChatB').hidden; })()`, 1000],
  [1, `(async () => { const c = cq.g.chars.find(o => o.remote); const r = 'amico: fumetto dell host "' + (c && c.bub ? c.bub.t : 'MANCA') + '" | log ' + cq.hlog.map(e => e.n + ': ' + e.t).join(' / '); cqChatSend('👋 Ciao!'); await new Promise(r => setTimeout(r, 1200)); return r; })()`, 0],
  [0, `(() => { const c = cq.g.chars.find(o => o.remote); return 'host: fumetto dell amico "' + (c && c.bub ? c.bub.t : 'MANCA') + '"'; })()`, 0],
  [0, `(async () => { const sid = Object.keys(cq.net.pl).find(s => s !== cq.net.sid); cqKick(sid); await new Promise(r => setTimeout(r, 2500)); return 'host: ' + __T.slice(-1)[0] + ' | nel party ' + Object.keys(cq.net.pl).length; })()`, 500],
  [1, `(async () => { const r = 'amico: nel party ' + !!cq.net + ', pannello "' + $('#tkTitle').textContent + '"'; const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); await cqNetJoin(code); return r + ' | riprova: ' + __T.slice(-1)[0] + ', dentro ' + !!cq.net; })()`, 500],
  [0, `(() => { cqNetLeave(); return 'set chiuso; errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'); })()`, 300],
  [1, `(() => 'amico errori ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'))()`, 0],
];
