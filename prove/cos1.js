// La Cosa: partite simulate con il computer (anche "io" sono guidato dal computer).
// uso: node prove/cdp.mjs . prove/cos1.js [foto.png]   (window.__N = partite; window.__SHOT = 'out' | 'in' | 'mon' | 'heli' per la foto finale)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  out.push('reception: ' + [...document.querySelectorAll('#tkBody [data-g]')].map(b => b.querySelector('.gt').textContent).join(', '));
  document.querySelector('#tkBody [data-g=cosa]').click(); await w(1500);
  out.push('impostazioni: ' + $('#tkBody').textContent.includes('Kit per l'));
  const N = +(window.__N || 8), res = { t: 0, h: 0 };
  for (let k = 0; k < N; k++) {
    if (k) { $('#enNew').click(); await w(300); }
    store.settings.cqModeOpt = Object.assign(store.settings.cqModeOpt || {}, { cosa: { time: 360, nt: 'auto', kits: 3, me: 'rnd', map: 'base', n: k % 2 ? 6 : 8, fill: true } });
    const rb = document.querySelector('#lbF input[name=n][value="' + (k % 2 ? 6 : 8) + '"]'); if (rb) rb.checked = true;
    $('#lbGo').click(); await w(900);
    const G = cq.g;
    if (k === 0) out.push('partita: ' + G.mode + ', ' + G.chars.map(c => c.name + (c.th ? ':COSA' : '')).join(' ') + ' | centro: ' + $('#cqCount').textContent + ' | barra: ' + $('#cqModeBar').textContent);
    G.me.bot = true; G.me.look = cqLook();
    cq.on = false; cancelAnimationFrame(cq.raf);
    const cnt = {}; const t0 = window.cqToast; window.cqToast = () => {};
    let last = 0;
    for (let i = 0; i < 20000 && G.phase === 'play'; i++) {
      cqModeTick(0.05); cq.x = G.me.x; cq.y = G.me.y; cq.walk = G.me.walk;
      for (const e of G.lg) if (e.n > last) { last = e.n; const k = e.k === 'tres' ? (e.ra || e.rb ? 'scoperta' : 'esame-ok') : e.k === 'burn' ? (e.th ? 'bruciata-Cosa' : 'bruciato-innocente') : e.k; cnt[k] = (cnt[k] || 0) + 1; }
      if (i % 400 === 0) { cqHudFast(); cqDraw(); }
    }
    window.cqToast = t0; cqCloseTask();
    const t = $('#tkBody .lead') ? $('#tkBody .lead').textContent : '?';
    if (t.includes('Cosa!')) res.t++; else res.h++;
    out.push('partita ' + (k + 1) + ' (' + G.chars.length + ' pers., ' + G.chars.filter(c => c.th).length + ' Cose): ' + Math.round(G.time) + ' s, ' + JSON.stringify(cnt) + ' | ' + t.slice(0, 120));
    cq.on = true; cq.last = performance.now(); cq.raf = requestAnimationFrame(cqFrame);
  }
  out.push('totale: Cosa ' + res.t + ', squadra ' + res.h);
  // una partita vera per la foto
  const S = window.__SHOT || 'in';
  $('#enNew').click(); await w(300);
  const mr = document.querySelector('#lbF input[name=me][value="' + (S === 'mon' ? 't' : 'h') + '"]'); if (mr) mr.checked = true;
  $('#lbGo').click(); await w(3600);
  {
    const G = cq.g, me = G.me;
    for (const c of G.chars) if (c.bot) { c.think = 999; c.path = []; }
    if (S === 'out') { cq.x = 6.5; cq.y = 31.5; G.chars[1].x = 8.5; G.chars[1].y = 32.5; G.chars[2].x = 12.5; G.chars[2].y = 33.5; }
    if (S === 'in') { cq.x = 40.5; cq.y = 15.5; G.chars[1].x = 41.5; G.chars[1].y = 13.5; G.chars[2].x = 38.5; G.chars[2].y = 13.5; }
    if (S === 'mon') { cq.x = 23.5; cq.y = 30.5; me.atkT = 1e9; const v = G.chars.find(c => !c.th); v.x = 24.6; v.y = 30.5; G.time = 1e9 - 0.5; }
    if (S === 'heli') { cq.x = 42.5; cq.y = 45.5; G.left = 20; G.heli = { t: G.time - 8 }; }
    if (S === 'gen') { cq.x = 22.5; cq.y = 30.5; G.gen.on = false; G.gen.p = 0.4; }
    await w(500);
    out.push('foto ' + S + ': pulsante ' + $('#cqKill').textContent + ' | barra: ' + $('#cqModeBar').textContent + ' | centro: ' + $('#cqCount').textContent);
  }
  out.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  return out;
})()
