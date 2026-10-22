// Duello degli alchimisti: I PIANI DELLA TORRE (serra carnivora, sala dell'orologio, laboratorio), una manche per piano.
// uso: node prove/cdp.mjs . prove/alc7.js [foto.png]   (foto: in alto la serra, in basso la sala dell'orologio, viste in partita)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc, M = G.M; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  cq.on = false; cancelAnimationFrame(cq.raf); const toasts = []; window.cqToast = t => toasts.push(t.replace(/<[^>]+>/g, ''));
  const step = (s, dt = 0.05) => { for (let i = 0; i < s / dt; i++) { cqModeTick(dt); M.local(G, dt); } };
  const bot = G.chars.find(c => c.bot);
  out.push('partenza: mappa ' + cq.map + ', piante ' + G.pl.length);
  // ogni piano: tutto raggiungibile, oggetti
  for (let fi = 0; fi < 3; fi++) {
    A.useFloor(fi);
    const Wd = CQ_W, seen = new Uint8Array(Wd * CQ_H), q = [[6, 6]]; seen[6 * Wd + 6] = 1;
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (cqCellFree(nx, ny) && !seen[ny * Wd + nx]) { seen[ny * Wd + nx] = 1; q.push([nx, ny]); } } }
    let n = 0; const isl = []; for (let y = 0; y < CQ_H; y++) for (let x = 0; x < Wd; x++) if (cqCellFree(x, y)) { n++; if (!seen[y * Wd + x]) isl.push(x + ',' + y); }
    const t0 = performance.now(); cq.bg = null; cqBuildBg(); const bt = Math.round(performance.now() - t0);
    out.push('piano ' + (fi + 1) + ' ' + A.FLOORS[fi].n + ' (' + cq.map + '): libere ' + n + (isl.length ? ' NON RAGGIUNGIBILI ' + isl.join(' ') : ' tutto raggiungibile') + ', angolo davanti ' + (seen[14 * Wd + 14] ? 'si' : 'NO') + ', mappa pronta ' + bt + ' ms, oggetti ' + Object.entries(CQ_PROPS.reduce((m, p) => (m[p[0]] = (m[p[0]] || 0) + 1, m), {})).map(([k, v]) => k + ' ' + v).join(' '));
  }
  A.useFloor(0); A.plantsInit(G);
  step(3.5); G.me.belt = ['f', 'g', 'i', 'v']; A.setReady(G, true); step(0.2);
  out.push('manche 1: ' + G.st.ph + ' sul piano ' + cq.map + ' | avviso: ' + (toasts.find(t => t.includes('Piano 1')) || 'NO').slice(0, 90));
  const fresh = () => { for (const c of G.chars) { c.hp = 3; c.iv = 0; c.fx = {}; c.sl = null; } cq.sl = null; G.zn = []; G.fl = []; G.pend = []; bot.hold = 1; bot.path = []; };
  // SERRA: la pianta grande al centro morde chi le passa vicino
  fresh(); bot.x = 10.5 + 1.1; bot.y = 10.5 + 0.2; step(1.0);
  out.push('🌿 pianta: il computer accanto -> cuori ' + bot.hp + ', incollato ' + !!(bot.fx.stuck > G.time));
  // fuoco sulla pianta: bruciata, non morde piu'
  fresh(); bot.x = 4; bot.y = 10.5; A.burst(G, 'f', 10.5, 10.5, G.me.id); step(0.2); const p0 = G.pl[0];
  out.push('🔥 fuoco sulla pianta: stato ' + p0.st + ' per ' + (p0.te - G.time).toFixed(0) + ' s'); bot.x = 11.6; bot.y = 10.7; bot.hp = 3; step(1.2); out.push('   il computer accanto alla pianta bruciata: cuori ' + bot.hp);
  // fungo sulla pianta piccola: diventa gigante e arriva lontano
  fresh(); const pi = 1, [px, py] = A.PLANTS[pi]; A.burst(G, 'g', px + 0.5, py + 0.5, G.me.id); step(0.2);
  out.push('🍄 fungo sulla pianta: ' + G.pl[pi].st); bot.x = px + 0.5 + 2.0; bot.y = py + 0.5; if (!cqFree(bot.x, bot.y)) bot.x = px + 0.5 - 2.0; step(1.2); out.push('   il computer a 2 caselle dalla pianta gigante: cuori ' + bot.hp);
  out.push('   avvisi piante: ' + toasts.filter(t => /Pianta/.test(t)).join(' | '));
  // tre manche sempre: vinco la prima
  fresh(); bot.hp = 1; A.burst(G, 'f', bot.x, bot.y, G.me.id); step(0.3);
  out.push('fine manche 1: ' + G.st.ph + ' | ' + (G.st.msg || '').split('\n').join(' / ') + ' | finita: ' + G.st.fin);
  step(5.6); out.push('manche 2: fase ' + G.st.ph + ', mappa ' + cq.map + ', pannello: ' + (document.getElementById('alFl') ? document.getElementById('alFl').textContent.slice(0, 50) : 'NO'));
  G.me.belt = ['f', 'v', 'i', 'w']; A.setReady(G, true); step(0.3);
  // OROLOGIO: ingranaggio che porta in giro; pendolo che sbalza
  fresh(); const [gx, gy] = A.GEARS[0]; cq.x = gx + 1.2; cq.y = gy; const a0 = Math.atan2(cq.y - gy, cq.x - gx); bot.x = 15.5; bot.y = 12.5; step(2);
  out.push('⚙️ sull\'ingranaggio per 2 s: girato di ' + Math.round((Math.atan2(cq.y - gy, cq.x - gx) - a0) * 57.3) + '°, distanza dal centro ' + Math.hypot(cq.x - gx, cq.y - gy).toFixed(2));
  fresh(); cq.x = 15.5; cq.y = 12.5; let hit = 0, tries = 0;
  for (let i = 0; i < 80; i++) { const B = A.pendPos(G.time + 0.3); if (!hit) { bot.x = B.x; bot.y = B.y; bot.hp = 3; } step(0.1); tries++; if (bot.hp < 3 || bot.sl) { hit = 1; break; } }
  out.push('🕰️ pendolo: il computer sotto -> colpito ' + !!hit + ' (cuori ' + bot.hp + ', spinto ' + !!bot.kb + ')');
  out.push('computer: evita la strada del pendolo? pericolo al centro ' + A.hazardAt(G, 10.5, 10.5) + ', in un angolo ' + A.hazardAt(G, 6.5, 6.5));
  // manche 2 a lui, manche 3 in cima
  fresh(); G.me.hp = 1; A.burst(G, 'f', cq.x, cq.y, bot.id); step(5.9);
  out.push('manche 3: fase ' + G.st.ph + ', mappa ' + cq.map + ', voragine ' + CQ_PROPS.filter(p => p[0] === 'pit').length + ' caselle, punteggio ' + JSON.stringify(G.st.sc));
  A.setReady(G, true); step(0.3); fresh(); bot.hp = 1; A.burst(G, 'f', bot.x, bot.y, G.me.id); step(5.9);
  out.push('fine: ' + G.phase + ' | ' + $('#tkTitle').textContent + ' | ' + $('#tkBody').textContent.replace(/\s+/g, ' ').slice(0, 70));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  // foto: serra e orologio in partita (due viste nella stessa immagine)
  if (window.__SHOT) {
    cqCloseTask(); G.phase = 'play'; const shots = [];
    for (const [fi, mx, my] of [[0, 9.2, 12.8], [1, 9.0, 12.6]]) {
      G.st = { n: fi + 1, ph: 'duel', t0: G.time, rd: {}, sc: {} }; A.useFloor(fi); A.plantsInit(G); cq.bg = null; U2ph = 0;
      fresh(); bot.hold = 1; cq.x = mx; cq.y = my; bot.x = 12.5; bot.y = 8.5; G.me.belt = ['f', 'i', 'v', 'g']; bot.belt = ['f', 'c', 'r', ''];
      if (fi === 0) { G.pl[0].bid = bot.id; G.pl[0].bt = G.time - 0.35; G.pl[1].st = 'giant'; G.pl[1].te = G.time + 9; }
      G.spl = []; G.time += 0.9; cqDraw(); shots.push($('#cqCanvas').toDataURL('image/png'));
    }
    document.body.innerHTML = '<div style="background:#000">' + shots.map(s => '<img src="' + s + '" style="display:block;width:100%;height:50vh;object-fit:cover">').join('') + '</div>';
    document.body.style.margin = 0;
  }
  return out.join('\n');
})()
