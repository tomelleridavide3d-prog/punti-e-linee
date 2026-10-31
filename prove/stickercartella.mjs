// sticker dalla cartella collegata (31-10-2026): la cartella di WhatsApp si sceglie una volta (showDirectoryPicker, qui finta), poi a ogni apertura
// della chat entrano da soli solo gli sticker nuovi, i piu' recenti per primi; quelli tolti con il dito non tornano.
// uso: node prove/cdp2.mjs . prove/stickercartella.mjs
export const n = 1;
export default [
  [0, `(async () => {
    const mk = async (col, name, t) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 64, 64);
      return new File([await new Promise(r => c.toBlob(r, 'image/webp'))], name, { type: 'image/webp', lastModified: t }); };
    const files = [await mk('#f00', 'a.webp', 1000), await mk('#0f0', 'b.webp', 3000), await mk('#00f', 'c.webp', 2000)];
    const dir = { name: 'WhatsApp Stickers', queryPermission: async () => 'granted', async *values() { for (const f of files) yield { kind: 'file', name: f.name, getFile: async () => f }; yield { kind: 'file', name: '.nomedia', getFile: async () => new File([], '.nomedia') }; } };
    await stkLoad(); for (const s of [...STK.list]) stkDel(s.id); await stkTx('readwrite', s => s.put({ k: 'seen', v: [] }), 'k');
    STK.dir = dir; const out = [];
    await stkSync(); out.push('primo giro ' + STK.list.length + ' (ordine dal piu recente: ' + STK.list.map(s => s.ts).join(',') + ')');
    await stkSync(); out.push('secondo giro ' + STK.list.length);
    files.push(await mk('#ff0', 'd.webp', 5000)); await stkSync(); out.push('nuovo arrivato: ' + STK.list.length + ', primo in fila ' + (STK.list[0].ts === 5000));
    stkDel(STK.list[1].id); await stkSync(); out.push('tolto uno, dopo il giro ' + STK.list.length);
    STK.list = null; await stkLoad(); out.push('dopo riapertura ' + STK.list.length);
    stkMenu(); const b = document.querySelector('#cqStkM [data-m="d"]'); out.push('pulsante: "' + b.textContent + '" visibile ' + !b.hidden);
    for (const s of [...STK.list]) stkDel(s.id);
    return out.join(' | ') + ' | errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 200); })()`, 0],
];
