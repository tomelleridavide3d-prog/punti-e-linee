// Foto del menu degli scacchi con le tendine (livello, colore, orologio aperto): node prove/cdp.mjs . prove/ch6.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  store.settings.myName = 'zzScaA'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzScaA'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(400); openCiack(); $('#pkGo').click(); await w(1500);
  CHS.setup(true, () => {}); await w(300);
  document.querySelector('#tvModal .chD[data-n=ck] summary').click(); await w(300);
  document.querySelector('#tvModal .chD[data-n=ck] [data-v="3+2"]').click(); await w(200);
  const closed = !document.querySelector('#tvModal .chD[data-n=ck]').open;
  document.querySelector('#tvModal .chD[data-n=ck] summary').click(); await w(300);
  return 'tendine ' + document.querySelectorAll('#tvModal .chD').length + ', si richiude dopo la scelta ' + closed + ', scritte: ' + [...document.querySelectorAll('#tvModal summary')].map(s => s.innerText.replace(/\s+/g, ' ')).join(' / ');
})()
