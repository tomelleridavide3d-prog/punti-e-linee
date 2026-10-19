// Caccia al mammut: 1) praterie col seme (tutto raggiungibile?), 2) partite simulate col computer (anche "io" sono guidato dal computer).
// uso: node prove/cdp.mjs . prove/mam1.js [foto.png]   (window.__N = quante partite, default 4; window.__NC = personaggi, default 6)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=mammut]').click(); await w(2500);
  out.push('impostazioni: ' + $('#tkBody').textContent.includes('Notti'));
  // ---- praterie ----
  const bad = [];
  for (let sd = 1; sd <= 12; sd++) {
    const t0 = performance.now(); cq.mapDirty = true; cqUseMap('prateria', sd * 7919); const ms = performance.now() - t0, M = CQ_MAP;
    const c0 = cqSpot(M.camp.x, M.camp.y + 2), ok = (x, y) => cqPath(c0.x, c0.y, x, y).length > 0, miss = [];
    if (!M.ok) miss.push('ok=false');
    for (const k of ['eat', 'drink', 'sleep']) M.places[k].forEach(([x, y]) => { if (!ok(x + 0.5, y + 0.5)) miss.push(k + '@' + x + ',' + y); });
    M.burrows.forEach(b => { if (!ok(b.x, b.y)) miss.push('tana'); });
    if (sd <= 3) out.push('prateria ' + sd + ': ' + Math.round(ms) + ' ms, alberi ' + M.trees.length + ', pascoli ' + M.places.eat.length + ', acqua ' + M.places.drink.length + ', tane ' + M.burrows.length + ', dormire ' + M.places.sleep.length + ', guadi ' + M.fords.length + ', stagni ' + M.ponds.length);
    if (miss.length) bad.push(sd + ': ' + miss.slice(0, 5).join(' '));
  }
  out.push('praterie con problemi: ' + (bad.length ? bad.join(' | ') : 'nessuna'));
  // ---- partite ----
  const N = +(window.__N || 4);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.mammut = Object.assign({}, store.settings.cqModeOpt.mammut || {}, { n: +(window.__NC || 6), nights: +(window.__NI || 3) }); saveStore();
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(1800);
    const G = cq.g;
    if (k === 0) out.push('partita: ' + G.chars.map(c => c.name + ':' + (c.role || '-')).join(' ') + ' | mammut hp ' + G.mm.hp + ' tracce iniziali ' + G.tr.length + ' | ' + $('#cqCount').textContent + ' | barra: ' + $('#cqModeBar').textContent);
    G.me.bot = true; G.me.role = 'h'; G.me.look = cqLook(); G.me.think = 0; G.me.path = [];
    cq.on = false; cancelAnimationFrame(cq.raf);
    const ev = {}; const t0 = window.cqToast; window.cqToast = h => { h = String(h); for (const [k2, re] of [['colpi', /colpito il mammut/], ['mancati', /Mancato/], ['cariche', /CARICARTI|travolto/], ['aterra', /terra|travolto|azzannato/], ['rialzati', /rialzato|di nuovo in piedi/], ['fantasmi', /non ce l'ha fatta|guardi la caccia/], ['conigli', /coniglio/], ['notti', /Notte \d/], ['fossa', /FOSSA/], ['abbattuto', /abbattuto il MAMMUT/], ['carne', /portato la carne/], ['rubati', /sciacall.*(rubato|portato via|divorano)/], ['fuocospento', /fuoco si è spento/], ['barriti', /barrito/]]) if (re.test(h)) ev[k2] = (ev[k2] || 0) + 1; };
    const st = {}; let t1 = performance.now(), minFuel = 999, maxTr = 0;
    for (let i = 0; i < 20 * 760 && G.phase === 'play'; i++) {
      cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; G.M.local(G, 0.05);
      st[G.mm.st] = (st[G.mm.st] || 0) + 1; if (G.time > 5) minFuel = Math.min(minFuel, G.fuel); maxTr = Math.max(maxTr, G.tr.length);
      if (i % 600 === 0) { cqHudFast(); cqDraw(); }
    }
    const msTick = (performance.now() - t1) / Math.max(1, G.time * 20);
    window.cqToast = t0;
    const t = $('#tkBody .lead') ? $('#tkBody .lead').textContent : '?';
    const tot = Object.values(st).reduce((a, b) => a + b, 0), pc = Object.entries(st).map(([k2, v]) => k2 + ' ' + Math.round(v / tot * 100) + '%').join(', ');
    out.push('partita ' + (k + 1) + ': ' + Math.round(G.time) + ' s, ' + $('#tkTitle').textContent + ' — ' + t.slice(0, 90) + ' | ' + JSON.stringify(ev) + ' | mammut: ' + pc + ' hp ' + G.mm.hp + '/' + G.mm.max + ' | fuoco min ' + Math.round(minFuel) + ', cibo ' + G.food + ', carne ' + G.home + ', tracce max ' + maxTr + ', fantasmi ' + G.chars.filter(c => !c.alive).length + ', ms/giro ' + msTick.toFixed(2));
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame);
  }
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
