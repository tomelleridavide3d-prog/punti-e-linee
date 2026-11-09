// Cactus: foto delle carte nuove (matte rossa e nera, normali e piccole, re rossi e neri a 2 colori, dorso a 2 colori)
// node prove/firefox2.mjs . prove/cactus.html prove/ct3.mjs 900 520   (CT_SHOT = file della foto)
const js = `(() => {
  CT.stop(true); document.body.innerHTML = '';
  const F = CARTE.fr, row = (list, w) => { const d = document.createElement('div'); d.style.cssText = 'display:flex;gap:10px;padding:10px;align-items:flex-end'; for (const [s, r, o] of list) { const im = new Image(); im.src = F.url(s, r, w * 2, Object.assign({ c2: true }, o)); im.style.width = w + 'px'; d.appendChild(im); } document.body.appendChild(d); };
  row([['x', 15], ['y', 15], ['h', 13], ['d', 13], ['c', 13], ['s', 13], ['', 0]], 115);
  row([['x', 15, { j: true }], ['y', 15, { j: true }], ['d', 13, { j: true }], ['c', 13, { j: true }], ['d', 7, { j: true }], ['c', 14, { j: true }], ['d', 12], ['c', 11]], 54);
  return 'ok';
})()`;
export default [[js, 800, process.env.CT_SHOT]];
