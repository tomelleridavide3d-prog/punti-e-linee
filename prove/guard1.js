// Guardaroba: foto di tutti i personaggi (anche esclusivi) senza accessori, con cappello + faccia, e di tutti i cappelli e gli accessori sull'omino.
// uso: node prove/cdpimg.mjs . prove/guard1.js foto.jpg 900 900
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  await w(500);
  const skins = Object.keys(CQ_SKINS).concat(Object.keys(CQX.SKINS)), heads = CQX.ITEMS.filter(i => i.k === 'h').map(i => i.id).concat(CQX.BASE), faces = CQX.ITEMS.filter(i => i.k === 'f').map(i => i.id);
  const cell = 74, cols = 12, rows = Math.ceil(skins.length / cols) * 2 + Math.ceil((heads.length + faces.length) / cols) + 1;
  const c = document.createElement('canvas'); c.width = cell * cols * 2; c.height = cell * rows * 2; const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = '#d8cfbd'; g.fillRect(0, 0, c.width, c.height);
  let i = 0;
  const put = (L, lab, walk) => { const x = (i % cols) * cell, y = Math.floor(i / cols) * cell; g.save(); cqPlayer(g, x + cell / 2, y + cell - 12, 22, L, walk || 0, 1); g.restore(); g.fillStyle = '#222'; g.font = '9px system-ui'; g.textAlign = 'center'; g.fillText(lab, x + cell / 2, y + cell - 2); i++; };
  for (const s of skins) put({ skin: s, col: (CQ_SKINS[s] || CQX.SKINS[s]).col || '#d8343a', hat: 'borsalino' }, s);
  i = Math.ceil(i / cols) * cols;
  skins.forEach((s, k) => put({ skin: s, col: (CQ_SKINS[s] || CQX.SKINS[s]).col || '#d8343a', hat: 'borsalino', ht: heads[k % heads.length], fc: faces[k % faces.length] }, heads[k % heads.length] + '+' + faces[k % faces.length]));
  i = Math.ceil(i / cols) * cols;
  for (const h of heads) put({ skin: 'omino', col: '#3a9ad8', hat: 'borsalino', ht: h }, h);
  for (const f of faces) put({ skin: 'omino', col: '#3a9ad8', hat: 'nessuno', fc: f }, f);
  return { img: c.toDataURL('image/jpeg', 0.9), out: 'personaggi ' + skins.length + ' cappelli ' + heads.length + ' facce ' + faces.length + ' errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300) };
})()
