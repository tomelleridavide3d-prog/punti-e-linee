// personaggio nuovo (07-11-2026): Whippet drago ('whippet'). Si disegna girato, camminando, con un cappello della gru, morto (occhi a X);
// nella scelta del personaggio e in rete. Con la foto: tavola grande per guardarlo.
// uso: node prove/cdp.mjs . prove/whippet.js foto.png
(async () => {
  const o = [], L = { skin: 'whippet', col: CQ_SKINS.whippet.col, hat: 'nessuno' };
  const c = document.createElement('canvas'); c.width = 900; c.height = 900; const g = c.getContext('2d');
  g.fillStyle = '#e4ddd0'; g.fillRect(0, 0, c.width, c.height);
  cqPlayer(g, 240, 440, 220, L, 0, 1); cqPlayer(g, 690, 440, 220, L, 0, -1);
  [0.8, 2.2].forEach((w, i) => cqPlayer(g, 110 + i * 210, 740, 120, L, w, 1));
  cqPlayer(g, 560, 740, 120, Object.assign({}, L, { ht: 'corona' }), 0, 1);
  cqPlayer(g, 770, 740, 120, L, 0, -1, false, true);
  cqPlayer(g, 450, 860, 40, L, 1.2, 1);
  document.body.innerHTML = ''; document.body.style.margin = 0; c.style.width = '412px'; document.body.appendChild(c);
  o.push('disegnato: ' + CQ_SKINS.whippet.n);
  store.settings.cqLook = { skin: 'whippet' }; o.push('scelto: ' + cqLook().skin + ', in rete: ' + cqNetLook({ skin: 'whippet' }).skin + ', nome sopra ' + cqTop(L));
  store.settings.cqLook = {};
  o.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return o.join(' | ');
})()
