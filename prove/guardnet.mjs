// Guardaroba online (2 pagine): A ha pescato il Draghetto, il cappello da mago e gli occhiali da sole; la scelta del personaggio li mostra,
// li indossa e l'amico B li vede nella hall. Un personaggio esclusivo NON pescato non si puo' scegliere.
// uso: node prove/cdp2.mjs . prove/guardnet.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); return 'pronto';
})()`;
export default [
  [0, name('zzCarA'), 0],
  [0, `(async () => {
    store.settings.coll = { drago: 1, mago: 1, sole: 1 }; store.settings.cqLook = { skin: 'cocco', ht: 'ghiaccio' }; saveStore();
    const L0 = cqLook(); const o = ['senza averli: skin ' + L0.skin + ' ht ' + (L0.ht || '-')];
    cqOpenPick(); await new Promise(r => setTimeout(r, 300));
    o.push('personaggi in scelta ' + document.querySelectorAll('#pkSkins button').length + ' drago ' + !!document.querySelector('#pkSkins [data-s=drago]') + ' cocco ' + !!document.querySelector('#pkSkins [data-s=cocco]'));
    o.push('testa: ' + [...document.querySelectorAll('#pkHt button')].map(b => b.textContent).join(',') + ' | faccia: ' + [...document.querySelectorAll('#pkFc button')].map(b => b.textContent).join(','));
    document.querySelector('#pkSkins [data-s=drago]').click(); document.querySelector('#pkHt [data-a=mago]').click(); document.querySelector('#pkFc [data-a=sole]').click();
    const L = cqLook(); o.push('scelto: ' + L.skin + ' ' + L.ht + ' ' + L.fc);
    $('#pkGo').click(); await new Promise(r => setTimeout(r, 1200)); $('#netNew').click(); await new Promise(r => setTimeout(r, 2500));
    return o.join(' | ');
  })()`, 0],
  [1, name('zzCarB'), 800],
  [1, `(async () => { $('#pkGo').click(); await new Promise(r => setTimeout(r, 1200)); const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzCarA'); cqNetJoin(code); await new Promise(r => setTimeout(r, 3500)); const c = cq.g.chars.find(c => c.remote); const L = c ? cqLookOf(c) : null; return L ? 'B vede A: ' + L.skin + ' ' + L.ht + ' ' + L.fc + ' cima ' + cqTop(L).toFixed(2) : 'B non vede A'; })()`, 0],
  [0, `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`, 0],
  [1, `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`, 0],
];
