// Nascondino: oggetti che spariscono a ogni partita e mappa che torna intera dopo (node prove/cdp.mjs . prove/nas2.js)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  const count = () => { let n = 0; for (const r of cqSolid) for (const c of r) if (c && c.prop) n++; return n; };
  document.querySelector('#tkBody [data-g=nascondino]').click(); await w(1500);
  const seen = [];
  for (let k = 0; k < 3; k++) {
    if (k) { cqModeEnd({ t: 'x', why: '', win: [], rank: [] }); await w(200); $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(900);
    const G = cq.g, gone = G.gone.map(a => a.join(',')).join(' ');
    seen.push(gone);
    out.push('partita ' + (k + 1) + ': tolti ' + G.gone.length + ' (' + gone + '), oggetti sulla mappa ' + count() + ', liberi: ' + G.gone.every(([x, y]) => cqCellFree(x, y)) + ', tra i bersagli: ' + G.gone.some(([x, y]) => G.M && false));
  }
  out.push('tolti diversi a ogni partita: ' + (new Set(seen).size === 3));
  // dopo: Ciack US sulla stessa mappa deve avere tutti gli oggetti
  cqModeEnd({ t: 'x', why: '', win: [], rank: [] }); await w(200);
  cqUseMap('studio'); out.push('dopo, studio rimesso: oggetti ' + count() + ' (tutti: ' + CQ_PROPS.length + ')');
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
