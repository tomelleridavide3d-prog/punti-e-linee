// risposte dello sviluppatore + bentornato (23-10-2026): node prove/cdp2.mjs . prove/risposte.mjs
// pagina 1 = un amico (zzAmico) manda una richiesta; pagina 0 = lo sviluppatore risponde dal pannello 📬 Richieste (senza codice: niente avviso sul telefono);
// l'amico vede la finestra "💬 Lo sviluppatore ti ha risposto!", preme Grazie e lo sviluppatore vede "✅ letta". Poi il saluto di bentornato.
const name = n => `(async () => {
  store.settings.myName = '${n}'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 2500)); return '${n} pronto, Firebase ' + !!hub.ok;
})()`;
export default [
  [0, name('zzSvil'), 0], [1, name('zzAmico'), 500],
  [1, `(async () => { rqOpen(); $('#rqTxt').value = 'zz prova: vorrei un personaggio pinguino'; $('#rqGo').click(); await new Promise(r => setTimeout(r, 2000)); return 'amico: ' + $('#rqWin .lead').textContent; })()`, 500],
  [0, `(async () => { await dlShow(); await rqShow(); const it = [...document.querySelectorAll('#rqBody .rqItem')].find(e => e.textContent.includes('zzAmico')); if (!it) return 'svil: richiesta NON trovata';
    it.querySelector('[data-rqrep]').click(); const f = it.querySelector('.rqForm'); f.querySelector('textarea').value = 'Ciao! Il pinguino arriva nel prossimo aggiornamento 🐧'; f.querySelector('input').value = '';
    f.querySelector('.btn.primary').click(); await new Promise(r => setTimeout(r, 1500)); return 'svil: ' + f.querySelector('.rqRes').textContent; })()`, 2500],
  [1, `(async () => { const w = $('#rrWin'); if (!w) return 'amico: finestra della risposta MANCA'; const t = w.textContent; $('#rrOk').click(); await new Promise(r => setTimeout(r, 1500)); return 'amico vede: ' + t.replace(/\\s+/g, ' ').slice(0, 200) + ' | dopo Grazie finestra aperta ' + !!$('#rrWin'); })()`, 500],
  [0, `(async () => { await rqShow(); const it = [...document.querySelectorAll('#rqBody .rqItem')].find(e => e.textContent.includes('zzAmico')); return 'svil vede: ' + (it.querySelector('.rqRep') ? it.querySelector('.rqRep').textContent.replace(/\\s+/g, ' ') : 'nessuna risposta') + ' | pulsante "' + it.querySelector('[data-rqrep]').textContent + '"'; })()`, 0],
  // pulizia: richiesta e risposta di prova (le regole permettono di cancellare una risposta per volta)
  [0, `(async () => { const F = await hubLoad(), sn = await F.get(F.ref(F.db, 'rq/' + RQ_K)); let n = 0; for (const [id, r] of Object.entries(sn.val() || {})) if (/^zz/i.test(r.n)) { await F.remove(F.ref(F.db, 'rq/' + RQ_K + '/' + id)); n++; } const rr = (await F.get(F.ref(F.db, 'rr/' + RQ_K + '/zzamico'))).val() || {}; for (const k of Object.keys(rr)) await F.remove(F.ref(F.db, 'rr/' + RQ_K + '/zzamico/' + k)); return 'pulizia: tolte ' + n + ' richieste di prova e le risposte'; })()`, 0],
  // bentornato: dopo 4 ore si', dopo 1 ora no
  [1, `(async () => { $('#dlWin') && ($('#dlWin').hidden = true); store.settings.seen = Date.now() - 4 * 3600000; wbCheck(); await new Promise(r => setTimeout(r, 800)); const a = $('#wbBox') ? $('#wbBox').textContent : 'NIENTE'; $('#wbBox') && $('#wbBox').remove();
    store.settings.seen = Date.now() - 3600000; wbCheck(); await new Promise(r => setTimeout(r, 300)); return 'dopo 4 ore: ' + a + ' | dopo 1 ora: ' + ($('#wbBox') ? 'saluto (SBAGLIATO)' : 'niente (giusto)'); })()`, 0],
  [0, `(() => 'errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'))()`, 0],
  [1, `(() => 'errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'))()`, 0],
];
