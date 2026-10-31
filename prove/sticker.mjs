// sticker nella chat della hall (31-10-2026): aggiunta dai file (uno fermo grande -> rimpicciolito, uno animato -> com'e'), salvati sul telefono,
// invio all'amico, sticker sopra la testa (#cqStkLay) da tutti e due, nel registro della chat, e spariti dopo 6 s.
// uso: node prove/cdp2.mjs . prove/sticker.mjs      (STK_FINTO=1: senza la regola sk pubblicata, l'upload/download e' finto)
const FINTO = !!process.env.STK_FINTO;
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
// GIF animata 1x1 a due fotogrammi (scritta a mano)
const GIF = `new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,255,0,0,0,0,255,33,255,11,78,69,84,83,67,65,80,69,50,46,48,3,1,0,0,0,
  33,249,4,0,20,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,33,249,4,0,20,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,76,1,0,59])`;
const files = `(async () => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#e33'; g.beginPath(); g.arc(256, 256, 220, 0, 7); g.fill();
  const png = await new Promise(r => c.toBlob(r, 'image/png')); return [new File([png], 'grande.png', { type: 'image/png' }), new File([${GIF}], 'ballo.gif', { type: 'image/gif' })]; })()`;
export default [
  [0, name('zzStA'), 0], [1, name('zzStB'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); cqNetList(); return 'party aperto'; })()`, 3000],
  [1, `(async () => { const k = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzStA'); if (!k) return 'B: PARTY NON IN LISTA'; await cqNetJoin(k);
    const t0 = performance.now(); while (!(cq.g && cq.g.hall && cq.net) && performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 50)); return 'B dentro: ' + !!(cq.g && cq.g.hall); })()`, 2000],
  [0, `(async () => { await stkLoad(); for (const s of [...STK.list]) stkDel(s.id);
    $('#cqChatB').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await new Promise(r => setTimeout(r, 300));
    const vuoto = $('#cqStk').textContent.trim(); await stkAdd(await ${files});
    const L = STK.list, fermo = L.find(s => !s.d.startsWith('data:image/gif')), ani = L.find(s => s.d.startsWith('data:image/gif'));
    const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = fermo.d; });
    STK.list = null; await stkLoad();   // come dopo aver riaperto la pagina
    return 'A: barra vuota "' + vuoto + '" | aggiunti ' + L.length + ' | fermo ' + fermo.d.slice(5, 15) + ' ' + im.naturalWidth + 'x' + im.naturalHeight + ' ' + Math.round(fermo.d.length / 1024) + ' KB | animato tenuto com e: ' + !!ani + ' | dopo riapertura ' + STK.list.length + ' | pulsanti ' + $('#cqStk').querySelectorAll('.st').length; })()`, 0],
  ...(FINTO ? [[1, `(async () => { const f = (await ${files})[1], d = await stkMake(f); STK.mem.set(stkId(d), d); return 'B: (finto) scaricato'; })()`, 0],
    [0, `(() => { for (const s of STK.list) STK.up.add(s.id); return 'A: (finto) caricato'; })()`, 0]] : []),
  [0, `(async () => { const ani = STK.list.find(s => s.d.startsWith('data:image/gif')); window.zzK = ani.id;
    $('#cqStk').querySelector('[data-k="' + ani.id + '"]').click(); await new Promise(r => setTimeout(r, 1500));
    const im = $('#cqStkLay img'); return 'A: pannello chiuso ' + $('#cqChatP').hidden + ' | il mio sticker sopra la testa ' + !!im + (im ? ' a ' + im.style.translate : '') + ' | myBub.k ' + (cq.myBub && cq.myBub.k === ani.id); })()`, 1500],
  [1, `(async () => { const t0 = performance.now(); let c; while (performance.now() - t0 < 6000) { c = cq.g.chars.find(o => o.name && o.name.startsWith('zzStA')); if (c && c.bub && c.bub.k && $('#cqStkLay img')) break; await new Promise(r => setTimeout(r, 50)); }
    const im = $('#cqStkLay img'), h = cq.hlog[cq.hlog.length - 1];
    $('#cqChatB').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await new Promise(r => setTimeout(r, 300));
    return 'B: sticker di A sopra la testa ' + !!im + (im ? ' ' + im.src.slice(0, 5) + ' a ' + im.style.translate : '') + ' dopo ' + Math.round(performance.now() - t0) + ' ms | registro: ' + (h && h.n + ' sticker ' + !!h.k) + ', foto nel registro ' + !!$('#cqChatLog img.stkL') + ' | barra B "' + $('#cqStk').textContent.trim() + '"'; })()`, 0],
  [1, `(async () => { await new Promise(r => setTimeout(r, 6000)); return 'B: dopo 6 s sticker sparito ' + !$('#cqStkLay img'); })()`, 0],
  [0, `(() => 'A: dopo 6 s sticker sparito ' + !$('#cqStkLay img'))()`, 0],
  [0, `(async () => { const f = STK.list.find(s => !s.d.startsWith('data:image/gif')); STK.last = 0; $('#cqStk').querySelector('[data-k="' + f.id + '"]').click(); return 'A manda il cerchio'; })()`, 1500],
  [1, `(() => 'B: foto')()`, 0, process.env.STK_SHOT],
  [1, `(async () => { let r; try { await cq.net.F.get(cqNetRef('sk')); r = 'ELENCO LEGGIBILE (male)'; } catch (e) { r = 'elenco bloccato (bene): ' + e.message.slice(0, 40); } return 'B: ' + r; })()`, 0],
  [1, `(() => { cqNetLeave(); return 'B esce; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 300],
  [0, `(() => { for (const s of [...STK.list]) stkDel(s.id); cqNetLeave(); return 'A chiude; errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300); })()`, 500],
];
