// giochi da tavola online (23-10-2026): node prove/cdp2.mjs . prove/tavolanet.mjs   (nomi zzTavA / zzTavB: non si mescolano con le prove delle altre sessioni)
// 1) BRISCOLA: A dalla reception sfida B scrivendo il nome -> party "solo su invito"; B vede "🃏 zzTavA ti sfida a Briscola · Gioca" -> entra -> il tavolo si apre a tutti e due
// 2) LINEE E QUADRETTINI: A "Amico a distanza" -> scrive zzTavB -> ✉️ Sfida (niente link); B riceve "zzTavA ti sfida!" -> Accetta -> partita a tutti e due
const name = n => `(async () => {
  window.alert = () => {};   // 'Il tuo amico e' uscito': nella prova non deve bloccare la pagina
  store.settings.myName = '${n}'; store.settings.friends = []; store.settings.mode = 'ai'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 1500)); openCiack(); $('#pkGo').click(); await new Promise(r => setTimeout(r, 800)); return '${n} in reception';
})()`;
const err = who => `(() => '${who} errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'))()`;
export default [
  [0, name('zzTavA'), 0], [1, name('zzTavB'), 500],
  [0, `(async () => { $('#tgBc').click(); await new Promise(r => setTimeout(r, 300)); document.querySelector('#tbFr .frAdd input').value = 'zzTavB'; document.querySelector('#tbFr [data-nm]').click(); await new Promise(r => setTimeout(r, 3500));
    return 'A: party ' + !!cq.net + ' solo su invito ' + !!(cq.net && cq.net.priv) + ', nella hall ' + !!(cq.g && cq.g.hall) + ', aspetto ' + (cq.bcWant ? cq.bcWant.n : '-') + ', amici ' + frList().map(x => x.n); })()`, 1500],
  [1, `(async () => { cqNetBox(); const b = document.querySelector('#lbNet [data-bc]'); const t = b ? b.closest('.invBox').textContent : 'MANCA'; if (b) b.click(); await new Promise(r => setTimeout(r, 7000));
    return 'B: riquadro "' + t + '" -> party ' + !!cq.net + ', tavolo aperto ' + !!document.getElementById('bcT') + ', richiesta di accettare ' + !!document.getElementById('bcModal'); })()`, 500],
  [0, `(() => 'A: tavolo aperto ' + !!document.getElementById('bcT') + ', in attesa ' + !!document.getElementById('bcModal') + ', carte in mano ' + document.querySelectorAll('#bcT img').length)()`, 0],
  [1, `(() => { const bt = document.getElementById('bcExit'); if (bt) bt.click(); const go = document.querySelectorAll('#bcAsk button')[1]; if (go) go.click(); closeCiack(); return 'B esce dall\\'hotel'; })()`, 1500],
  [0, `(() => { const bt = document.getElementById('bcExit'); if (bt) bt.click(); const go = document.querySelectorAll('#bcAsk button')[1]; if (go) go.click(); return 'A: tavolo chiuso ' + !document.getElementById('bcT'); })()`, 500],
  [0, err('A'), 0], [1, err('B'), 0],
  // Linee e quadrettini
  [0, `(async () => { closeCiack(); await new Promise(r => setTimeout(r, 500)); cqReception && 0; openCiack(true); await new Promise(r => setTimeout(r, 500)); $('#tgDots').click(); await new Promise(r => setTimeout(r, 800));
    const on = [...document.querySelectorAll('#fSetup [name=mode]')].find(i => i.value === 'online'); on.checked = true; $('#fSetup').oninput({ target: on }); await new Promise(r => setTimeout(r, 400));
    document.querySelector('#salaList .frAdd input').value = 'zzTavB'; document.querySelector('#salaList [data-nm]').click(); await new Promise(r => setTimeout(r, 3000));
    return 'A: sala d\\'attesa aperta ' + $('#dLobby').open + ' "' + $('#lobbyBody').textContent.replace(/\\s+/g, ' ').slice(0, 160) + '" link visibile ' + !$('#lobbyBody .linkbox').hidden; })()`, 1500],
  [1, `(async () => { const open = $('#dInvite').open, t = open ? $('#inviteBody').textContent.replace(/\\s+/g, ' ').slice(0, 80) : 'NESSUNA SFIDA'; if (open) $('#ivYes').click(); await new Promise(r => setTimeout(r, 8000));
    return 'B: "' + t + '" -> partita ' + !!(net && net.cfg) + ', online ' + !!(game && game.online) + ', contro ' + (net && net.cfg ? net.cfg.host : '-'); })()`, 1000],
  [0, `(() => 'A: partita ' + !!(net && net.cfg) + ', contro ' + (net && net.cfg ? net.cfg.guest : '-') + ', sala d\\'attesa chiusa ' + !$('#dLobby').open)()`, 0],
  [1, `(() => { if (net) leaveOnline(); return 'B esce'; })()`, 500],
  [0, `(() => { if (net) leaveOnline(); return 'A esce'; })()`, 300],
  [0, err('A'), 0], [1, err('B'), 0],
];
