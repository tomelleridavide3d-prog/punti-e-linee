// sticker dalla cartella collegata (31-10-2026): si sceglie una volta una cartella (showDirectoryPicker, qui finta), anche piu' in alto
// (Android › media): quella degli sticker di WhatsApp la trova il gioco; poi a ogni apertura della chat entrano da soli solo gli sticker nuovi,
// i piu' recenti per primi; quelli tolti con il dito non tornano.
// uso: node prove/cdp2.mjs . prove/stickercartella.mjs
export const n = 1;
export default [
  [0, `(async () => {
    const mk = async (col, name, t) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 64, 64);
      return new File([await new Promise(r => c.toBlob(r, 'image/webp'))], name, { type: 'image/webp', lastModified: t }); };
    const files = [await mk('#f00', 'a.webp', 1000), await mk('#0f0', 'b.webp', 3000), await mk('#00f', 'c.webp', 2000)];
    const F = f => ({ kind: 'file', name: f.name, getFile: async () => f });
    const D = (name, kids) => ({ kind: 'directory', name, queryPermission: async () => 'granted', async *values() { for (const k of (typeof kids === 'function' ? kids() : kids)) yield k; },
      async getDirectoryHandle(n) { const k = (typeof kids === 'function' ? kids() : kids).find(k => k.kind === 'directory' && k.name === n); if (!k) throw new Error('manca ' + n); return k; } });
    const stk = D('WhatsApp Stickers', () => [...files.map(F), F(new File([], '.nomedia'))]);
    const media = D('media', [D('com.facebook.katana', []), D('com.whatsapp.w4b', [D('WhatsApp Business', [D('Media', [D('WhatsApp Business Stickers', [])])])]),
      D('com.whatsapp', [D('WhatsApp', [D('.Shared', []), D('Media', [D('WhatsApp Images', [F(files[0])]), D('WhatsApp Stickers', stk.values.bind(stk)), D('WhatsApp Video', [])])])])]);
    // la cartella degli sticker vera, con i file che cambiano
    media.getDirectoryHandle; const realStk = stk; const wa = (await (await (await (await media.getDirectoryHandle('com.whatsapp')).getDirectoryHandle('WhatsApp')).getDirectoryHandle('Media')));
    wa.getDirectoryHandle = async n => n === 'WhatsApp Stickers' ? realStk : D(n, []);
    await stkLoad(); for (const s of [...STK.list]) stkDel(s.id); await stkTx('readwrite', s => s.put({ k: 'seen', v: [] }), 'k');
    const out = [];
    window.showDirectoryPicker = async () => D('Download', [D('Telegram', [])]); STK.dir = null; await stkLink(); out.push('cartella sbagliata: collegata ' + !!STK.dir);
    window.showDirectoryPicker = async () => media; await stkLink(); while (STK.sync) await new Promise(r => setTimeout(r, 50));
    out.push('scelta "media": strada trovata ' + (STK.dir && STK.dir.path.join(' > ')) + ' | primo giro ' + STK.list.length + ' (ordine: ' + STK.list.map(s => s.ts).join(',') + ')');
    await stkSync(); out.push('secondo giro ' + STK.list.length);
    files.push(await mk('#ff0', 'd.webp', 5000)); await stkSync(); out.push('nuovo arrivato: ' + STK.list.length + ', primo in fila ' + (STK.list[0].ts === 5000));
    stkDel(STK.list[1].id); await stkSync(); out.push('tolto uno, dopo il giro ' + STK.list.length);
    STK.list = null; await stkLoad(); out.push('dopo riapertura ' + STK.list.length);
    STK.dir = null; window.showDirectoryPicker = async () => realStk; await stkLink(); out.push('scelta proprio la cartella degli sticker: strada "' + STK.dir.path.join(' > ') + '"');
    // collegamento della versione di prima: cartella "media" senza strada, permesso da chiedere, file senza estensione
    while (STK.sync) await new Promise(r => setTimeout(r, 50));
    for (const s of [...STK.list]) stkDel(s.id); await stkTx('readwrite', s => s.put({ k: 'seen', v: [] }), 'k');
    files.push(await mk('#0ff', 'STK-senza-estensione', 6000)); let perm = 'prompt'; media.queryPermission = async () => perm; media.requestPermission = async () => (perm = 'granted');
    STK.dir = { h: media, path: [] }; await stkSync(false); out.push('vecchio collegamento, aprendo la chat: serve il tasto ' + STK.need + ', tasto Carica ' + !!document.querySelector('#cqStk [data-r]'));
    document.querySelector('#cqStk [data-r]').click(); while (STK.sync) await new Promise(r => setTimeout(r, 50));
    out.push('dopo il tocco su Carica: strada ' + STK.dir.path.join(' > ') + ', sticker ' + STK.list.length + ' (anche senza estensione ' + STK.list.some(s => s.ts === 6000) + '), tasto sparito ' + !document.querySelector('#cqStk [data-r]'));
    stkMenu(); const b =document.querySelector('#cqStkM [data-m="d"]'); out.push('pulsante: "' + b.textContent + '" visibile ' + !b.hidden);
    for (const s of [...STK.list]) stkDel(s.id);
    return out.join(' | ') + ' | errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 200); })()`, 0],
];
