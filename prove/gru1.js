// Gru dei peluche: pulsante vicino alla gru, 15 tentativi (pinza mirata sopra un peluche a caso), premi, doppioni, pinza fortunata, indossa, album.
// uso: node prove/cdp.mjs . prove/gru1.js foto.png   (la foto resta sull'ultimo premio)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), o = [];
  store.settings.myName = 'zzCarA'; store.settings.sound = false; store.settings.coll = {}; store.settings.gruPity = 0; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzCarA'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(400); openCiack(); $('#pkGo').click(); await w(1500); $('#netNew').click(); await w(3500);
  cqBank().coins = 60; saveStore();
  cq.x = CQ_W - 2 + 0.3; cq.y = 2.6; await w(500);
  const B = document.getElementById('grHallB'); o.push('pulsante ' + (B && !B.hidden)); if (!B || B.hidden) return o.join(' | ');
  B.click(); await w(500);
  const res = [], luck = [];
  for (let k = 0; k < 15; k++) {
    const V = GR.V; if (!V) break;
    if (V.ph !== 'idle') { const p = document.querySelector('.grPrize .grOk'); if (p) p.click(); await w(300); if (GR.V.ph === 'miss') { GR.V.ph = 'idle'; } }
    if (store.settings.gruPity >= 9) luck.push(k);
    document.querySelector('#grRoot .grGo').click(); await w(200);
    const t = GR.V.pl[Math.floor(Math.random() * GR.V.pl.length)]; GR.V.claw.x = t.x + (Math.random() - 0.5) * t.s * 0.6; GR.drop();
    for (let i = 0; i < 60 && !['prize', 'miss'].includes(GR.V.ph); i++) await w(150);
    res.push(GR.V.ph === 'prize' ? 'P' + (document.querySelector('.grRar') || {}).textContent[0] : GR.V.ph === 'miss' ? 'x' : '?' + GR.V.ph); if (!['prize', 'miss'].includes(GR.V.ph)) return o.concat('bloccato: ' + res.join(' ') + ' fall ' + !!GR.V.fall + ' held ' + !!GR.V.held + ' claw ' + JSON.stringify(GR.V.claw)).join(' | ');
  }
  o.push('esiti ' + res.join(' ') + ' | pinza fortunata ai tentativi ' + luck.join(',') + ' | monete ' + cqBank().coins + ' | collezione ' + Object.keys(store.settings.coll).join(','));
  const wear = document.querySelector('.grPrize .grWear');
  if (wear) { wear.click(); await w(300); const L = cqLook(); o.push('indossato: skin ' + L.skin + ' ht ' + L.ht + ' fc ' + L.fc); }
  if (!wear) GR.idle(); await w(200); document.querySelector('#grRoot .grAl').click(); await w(500); o.push('album: ' + document.querySelector('.grAlbum h2').textContent + ' caselle ' + document.querySelectorAll('.grIt').length);
  document.querySelector('.grAlbum .grOk').click();
  // ultimo giro per la foto del premio: pinza fortunata
  GR.idle(); store.settings.gruPity = 9; saveStore(); document.querySelector('#grRoot .grGo').click(); await w(200);
  const t = GR.V.pl[0]; GR.V.claw.x = t.x; GR.drop(); for (let i = 0; i < 60 && GR.V.ph !== 'prize'; i++) await w(150);
  o.push('fortunata: ' + GR.V.ph + ' ' + ((document.querySelector('.grPrize') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 120));
  o.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return o.join(' | ');
})()
