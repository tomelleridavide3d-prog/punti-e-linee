// personaggi nuovi (04-11-2026): Mr Cucumber ('cetriolo') e Mr Coconut ('coconut'). Si disegnano girati, camminando, con un cappello
// e una faccia della gru, morti (occhi a X); nella scelta del personaggio e in rete. Con la foto: tavola grande per guardarli.
// uso: node prove/cdp.mjs . prove/mrpersonaggi.js foto.png
(async () => {
  const o = [], K = ['cetriolo', 'coconut'];
  const c = document.createElement('canvas'); c.width = 820; c.height = 1700; const g = c.getContext('2d');
  g.fillStyle = '#d8d2c4'; g.fillRect(0, 0, c.width, c.height);
  K.forEach((k, r) => {
    const L = { skin: k, col: CQ_SKINS[k].col, hat: 'nessuno' };
    cqPlayer(g, 200, 420 + r * 820, 340, L, 0, 1); cqPlayer(g, 600, 420 + r * 820, 340, L, 0, -1);
    [0.8, 2.2].forEach((w, i) => cqPlayer(g, 110 + i * 200, 720 + r * 820, 150, L, w, 1));
    cqPlayer(g, 530, 720 + r * 820, 150, Object.assign({}, L, { ht: 'corona' }), 0, 1);
    cqPlayer(g, 710, 720 + r * 820, 150, L, 0, -1, false, true);
  });
  document.body.innerHTML = ''; document.body.style.margin = 0; c.style.width = '412px'; document.body.appendChild(c);
  o.push('disegnati: ' + K.map(k => CQ_SKINS[k].n).join(', '));
  store.settings.cqLook = { skin: 'coconut' }; o.push('scelto: ' + cqLook().skin + ', in rete: ' + cqNetLook({ skin: 'cetriolo' }).skin);
  o.push('nome sopra: ' + K.map(k => cqTop({ skin: k })).join(', '));
  store.settings.cqLook = {};
  o.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return o.join(' | ');
})()
