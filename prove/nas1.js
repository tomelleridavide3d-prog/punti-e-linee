// Nascondino sul set: partite simulate con il computer (anche "io" sono guidato dal computer).
// uso: node prove/cdp.mjs . prove/nas1.js [foto.png]   (window.__ROLE = 1 per farmi cercatore nella foto finale)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  out.push('reception: ' + [...document.querySelectorAll('#tkBody [data-g]')].map(b => b.querySelector('.gt').textContent).join(', '));
  document.querySelector('#tkBody [data-g=nascondino]').click(); await w(1500);
  out.push('impostazioni: ' + $('#tkBody').textContent.includes('Tempo per nascondersi'));
  const N = +(window.__N || 8), res = { s: 0, h: 0 };
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { nascondino: { time: 240, seek: k % 2 ? 2 : 1, hide: 20, map: 'studio', n: 8, fill: true } });
    const rb = document.querySelector('#lbF input[name=seek][value="' + (k % 2 ? 2 : 1) + '"]'); if (rb) rb.checked = true;
    const rd = document.querySelector('#lbF input[name=dark][value="' + (k % 4 < 2 ? 'on' : 'dark') + '"]'); if (rd) rd.checked = true;
    $('#lbGo').click(); await w(900);
    const G = cq.g;
    if (k === 0) out.push('partita: ' + G.mode + ', ruoli ' + G.chars.map(c => c.name + ':' + c.r).join(' ') + ' | centro: ' + $('#cqCount').textContent + ' | barra: ' + $('#cqModeBar').textContent);
    G.me.bot = true; G.me.look = cqLook();
    cq.on = false; cancelAnimationFrame(cq.raf);
    let miss = 0, snd = 0; const t0 = window.cqToast; window.cqToast = h => { h = String(h); }; const m0 = G.M;
    let disg = -1;
    for (let i = 0; i < 12000 && G.phase === 'play'; i++) {
      const sh = G.lg.length ? G.lg[G.lg.length - 1].n : 0;
      cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; cq.walk = G.me.walk;
      for (const e of G.lg) if (e.n > sh) { if (e.k === 'miss') miss++; if (e.k === 'snd') snd++; }
      if (disg < 0 && G.time > (G.opt.hide + 0.5)) disg = G.chars.filter(c => c.r === 0 && c.pr).length + '/' + G.chars.filter(c => c.r === 0).length;
      if (i % 300 === 0) { cqHudFast(); cqDraw(); }
    }
    window.cqToast = t0;
    const t = $('#tkBody .lead') ? $('#tkBody .lead').textContent : '?';
    if (t.includes('cercatori!')) res.s++; else res.h++;
    out.push('partita ' + (k + 1) + ' (' + G.opt.seek + ' cerc.' + (G.opt.dk ? ', buio' : '') + '): ' + Math.round(G.time) + ' s, travestiti a fine conta ' + disg + ', errori ' + miss + ', versi ' + snd + ' | ' + t.slice(0, 90));
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame);
  }
  out.push('totale: cercatori ' + res.s + ', nascosti ' + res.h);
  // una partita vera per la foto: io nascosto travestito accanto a un oggetto, bot fermi
  $('#enNew').click(); await w(300); if (window.__DARK) document.querySelector('#lbF input[name=dark][value=dark]').checked = true; $('#lbGo').click(); await w(3600);
  {
    const G = cq.g, me = G.me, want = window.__ROLE != null ? +window.__ROLE : 0;
    for (const c of G.chars) c.r = c === me ? want : (c === G.chars[1] ? 1 - want : 0);
    const P = CQ_PROPS.find(p => p[0] === 'crate' && cqCellFree(p[1] + 1, p[2])); cq.x = P[1] + 1.5; cq.y = P[2] + 0.5;
    for (const c of G.chars) if (c.bot) { c.think = 999; c.path = []; }
    const s = G.chars[1]; s.x = cq.x + 1.5; s.y = cq.y + 1; s.pr = want === 1 ? ['plant', 0] : null;
    await w(300);
    out.push('pulsante: ' + $('#cqKill').textContent + ' on=' + $('#cqKill').classList.contains('on') + ' | centro: ' + $('#cqCount').textContent);
    if (want === 1) G.time = G.opt.hide + 1; else { cqMyKill(); await w(400); out.push("menu: " + $("#tkTitle").textContent + " voci " + $("#tkBody").querySelectorAll("[data-v]").length + ": " + [...$("#tkBody").querySelectorAll("[data-v] span")].map(s => s.textContent).join("/")); $("#tkBody").querySelector("[data-v]").click(); await w(300); }
    out.push('dopo il pulsante: travestito ' + JSON.stringify(me.pr) + ' | barra: ' + $('#cqModeBar').textContent + ' | disegno: ' + JSON.stringify(G.M.prop(me)));
  }
  if (!window.__ROLE) { cqMyKill(); await w(300); }
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
