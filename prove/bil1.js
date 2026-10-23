// Biliardo contro il computer: pulsante vicino al tavolo, partita intera (i miei tiri li sceglie la stessa mira del Conte), regole, fine.
// uso: node prove/cdp.mjs . prove/bil1.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), o = [];
  store.settings.myName = 'zzCarA'; store.settings.sound = false; saveStore(); window.cqFast = 6;
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzCarA'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(400); openCiack(); $('#pkGo').click(); await w(1500); $('#netNew').click(); await w(3500);
  // fisica: stessa partenza = stesso risultato
  const r0 = BI.rack(), a = BI.simAll(r0, 0, -1, 0.95), b = BI.simAll(r0, 0, -1, 0.95);
  o.push('apertura: in buca ' + a.ev.pots.join(',') + ' passi ' + a.ev.n + ' uguali ' + (JSON.stringify(a.B) === JSON.stringify(b.B)));
  cq.x = CQ_W - 2 - 10.5; cq.y = 9.6; await w(500);
  const B = document.getElementById('tvB_bi'); o.push('pulsante ' + (B && !B.hidden)); if (!B || B.hidden) return o.join(' | ');
  B.click(); await w(300); document.querySelector('#tvModal [data-k=ai]').click(); await w(300); document.querySelector('#tvModal [data-k=b0]').click(); await w(600);
  let shots = 0, msgs = new Set();
  for (let g = 0; g < 400 && BI.T && BI.T.S.ph === 'play'; g++) {
    const T = BI.T, S = T.S;
    if (S.msg) msgs.add(S.msg.replace(/<[^>]+>/g, ''));
    if (S.tu === 0 && !T.anim) { const sh = BI.aiTurn({ S: Object.assign({}, S, { ai: 0 }) }); BI.act(sh); shots++; }
    await w(250);
  }
  await w(3000); const S = BI.T.S;
  o.push('tiri miei ' + shots + ', fase ' + S.ph + ', vince ' + S.win + ', perche ' + (S.why || '').replace(/<[^>]+>/g, '') + ', gruppi ' + S.grp.join('/') + ', in buca ' + S.pot.length);
  o.push('messaggi: ' + [...msgs].slice(0, 6).join(' / '));
  o.push('fine: ' + ((document.querySelector('.tvEnd') || {}).innerText || '').replace(/\s+/g, ' '));
  const rb = document.querySelector('.tvEnd [data-k=rv]'); if (!rb) return o.join(' | ') + ' | partita non finita'; rb.click(); await w(800); window.cqFast = 1;
  o.push('rivincita: ' + BI.T.S.ph + ' palle ' + BI.T.S.b.length + ' tocca ' + BI.T.S.tu);
  o.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return o.join(' | ');
})()
