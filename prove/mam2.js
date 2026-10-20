// Caccia al mammut, giro 5 (caccia vera): i cacciatori del computer partono gia' vicino al mammut, di giorno.
// Controlla: le lance da sole non lo abbattono (si fermano alla vita minima), accerchiamento, fossa scavata in due, spinta con le urla, abbattimento.
// uso: node prove/cdp.mjs . prove/mam2.js   (window.__N = quante prove, default 8)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=mammut]').click(); await w(2500);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.mammut = Object.assign({}, store.settings.cqModeOpt.mammut || {}, { n: 6, nights: 2 }); saveStore();
  const N = +(window.__N || 8);
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    $('#lbGo').click(); await w(1800);
    const G = cq.g, m = G.mm;
    G.me.bot = true; G.me.role = 'h'; G.me.look = cqLook(); G.me.think = 0; G.me.path = [];
    for (const c of G.chars) c.role = 'h';
    cq.on = false; cancelAnimationFrame(cq.raf);
    // tutti a 7-9 caselle dal mammut, sparsi, e lo sanno
    G.time = 8; G.pre = 0;
    G.chars.forEach((c, i) => { for (let t = 0; t < 40; t++) { const a = i / G.chars.length * 7 + t * 0.3, r = 7 + (t % 3), x = Math.floor(m.x + Math.cos(a) * r), y = Math.floor(m.y + Math.sin(a) * r); if (cqCellFree(x, y) && cqPath(x + 0.5, y + 0.5, m.x, m.y).length) { c.x = x + 0.5; c.y = y + 0.5; c.path = []; break; } } });
    cq.x = G.me.x; cq.y = G.me.y;
    const ev = {}, t0 = window.cqToast; window.cqToast = h => { h = String(h); for (const [k2, re] of [['colpi', /colpito il mammut/], ['nonbastano', /non bastano/], ['mancati', /Mancato/], ['cariche', /CARICARTI|travolto dal mammut/], ['circondato', /CIRCONDATO/], ['sfonda', /sfonda/], ['fossapronta', /Fossa pronta/], ['nellafossa', /caduto nella FOSSA/], ['abbattuto', /abbattuto il MAMMUT/]]) if (re.test(h)) ev[k2] = (ev[k2] || 0) + 1; };
    let hpMinOpen = 99, kill = -1;
    for (let i = 0; i < 20 * 100 && G.phase === 'play'; i++) {   // 100 s di caccia
      G.kn = G.kn && G.time - G.kn.t < 30 ? G.kn : { x: m.x, y: m.y, t: G.time };
      cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; G.M.local(G, 0.05);
      if (m.st !== 'trap' && m.st !== 'stuck' && m.st !== 'dead') hpMinOpen = Math.min(hpMinOpen, m.hp);
      if (m.st === 'dead' && kill < 0) kill = Math.round(G.time - 8);
    }
    window.cqToast = t0;
    out.push('prova ' + (k + 1) + ': ' + JSON.stringify(ev) + ' | vita ' + m.hp + '/' + m.max + ' (minima fuori dalla fossa ' + hpMinOpen + ', soglia ' + Math.max(2, Math.round(m.max * 0.4)) + ') | fosse ' + G.traps.length + ' | ' + (kill >= 0 ? 'ABBATTUTO in ' + kill + ' s' : 'vivo, stato ' + m.st) + ' | a terra ' + G.chars.filter(c => c.dn).length);
    if (G.phase === 'play') G.M.finish(G, 0, 'fine prova');
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame); await w(400);
  }
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
