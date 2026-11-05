// Prova dello schermo della Valle dei Clan (node prove/cdp.mjs . prove/valle3.js foto.png): pagina prove/vallegioco.html in un
// riquadro a tutto schermo, partita contro 2 computer giocata coi tocchi veri (tocco sul posto, Gira, Conferma, omino).
// window.__N = turni miei prima di fermarsi per la foto (predefinito: tutta la partita).
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  document.querySelectorAll('dialog').forEach(d => { try { d.close(); } catch (e) {} });   // finestre dell'hotel sotto: via
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483647;background:#000';
  f.src = '/prove/vallegioco.html'; document.body.appendChild(f);
  let w; for (let i = 0; i < 80; i++) { await sleep(100); w = f.contentWindow; if (w && w.VG && w.VG.U) break; }
  if (!w || !w.VG) return 'pagina non caricata';
  const doc = w.document, out = [];
  // tendina: 2 avversari
  doc.querySelector('details[data-k="n"]').open = true; doc.querySelector('details[data-k="n"] .opts button[data-v="2"]').click();
  doc.querySelector('#vgGo').click(); await sleep(200);
  const U = () => w.VG.U, G = () => U().G, N = window.__N || +(new URLSearchParams(location.search).get('n') || 0) || 999;
  let mine = 0, guard = 0, errs = 0, totems = 0;
  while (G().ph !== 'end' && guard++ < 3000) {
    if (G().cur !== 0 || U().busy) { await sleep(60); continue; }
    if (G().ph === 'totem') { doc.querySelector('#vgAlt').click(); totems++; await sleep(30); continue; }
    if (G().ph === 'tile' && !U().sel) {
      if (mine >= N && !window.__M) break;
      const m = w.VE.aiMove(G(), { noise: 4, seed: 3 });
      const [sx, sy] = w.VG.toScreen(m.x + 0.5, m.y + 0.5);
      // il posto potrebbe essere fuori schermo: sposto la mappa
      if (sx < 20 || sy < 80 || sx > w.innerWidth - 20 || sy > w.innerHeight - 120) { U().cam.x = m.x + 0.5; U().cam.y = m.y + 0.5; }
      const [tx, ty] = w.VG.toScreen(m.x + 0.5, m.y + 0.5);
      w.VG.tapAt(tx, ty);
      if (!U().sel) { out.push('tocco sul posto non preso'); errs++; break; }
      let k = 0; while (U().sel.rs[U().sel.ri] !== m.r && k++ < 4) doc.querySelector('#vgAlt').click();
      if (U().sel.rs[U().sel.ri] !== m.r) { out.push('rotazione non trovata'); errs++; break; }
      doc.querySelector('#vgOk').click(); await sleep(30);
      if (mine >= N && window.__M) { if (G().ph === 'meeple' && U().mopts.length) { U().mo = U().mopts[0]; doc.querySelector('#vgOk'); } break; }
      if (G().ph === 'meeple' && G().cur === 0) {
        if (m.m) { const o = U().mopts.find(o => o.j === m.m.j && o.k === m.m.k); if (!o) { out.push('omino non tra le scelte'); errs++; } U().mo = o || null; }
        doc.querySelector('#vgOk').click();
      }
      mine++;
      continue;
    }
    await sleep(40);
  }
  await sleep(window.__M ? 600 : 1800);
  const g = G();
  out.push('fase ' + g.ph + ', sciamano ' + totems + ', miei turni ' + mine + ', tessere ' + g.tiles.length + ', punti ' + g.P.map(p => p.n + ' ' + p.sc).join(' / '));
  if (g.ph === 'end') { await sleep(1500); const p = doc.querySelector('#vgPanel h2'); out.push('riquadro: ' + (p ? p.textContent : 'NESSUNO')); if (!p) errs++; }
  out.push(errs ? 'PROVA FALLITA' : 'PROVA PASSATA');
  return out.join('\n');
})()
