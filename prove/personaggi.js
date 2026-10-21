// personaggi nuovi (Banana bread, Lupo T-rex): nella scelta del personaggio, si disegnano girati e camminando senza errori
(async () => {
  const o = [], c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d');
  for (const k of ['pane', 'lupo']) for (const f of [1, -1]) for (const w of [0, 1, 2.5]) cqPlayer(g, 100, 160, 60, { skin: k, col: CQ_SKINS[k].col, hat: 'nessuno' }, w, f);
  o.push('disegnati: ' + ['pane', 'lupo'].map(k => CQ_SKINS[k].n).join(', '));
  store.settings.cqLook = { skin: 'lupo' }; o.push('scelto: ' + cqLook().skin + ', in rete: ' + cqNetLook({ skin: 'pane' }).skin);
  o.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  store.settings.cqLook = {};
  return o.join(' | ');
})()
